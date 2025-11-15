import { Job } from 'bullmq';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import csvParser from 'csv-parser';
const { parse } = csvParser;

import JobModel from '../models/Job.js';
import { s3Client, PLAN_LIMITS } from '../config/s3.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { emitProgress } from '../utils/broadcaster.js';

// Import only what actually exists
import { createCleaningStream } from '@csvpro/cleaning-engine/node';
import { operations as availableOperations } from '@csvpro/cleaning-engine/operations';
//import { optimizeOperationSequence } from '@csvpro/cleaning-engine/utils/operationSequencer';

/**
 * Enhanced CSV processing worker with operation optimization
 */
const processCsvJob = async (job) => {
    const { jobId } = job.data;
    const jobRecord = await JobModel.findById(jobId).populate('user');
    
    if (!jobRecord) {
        throw new Error(`Job ${jobId} not found`);
    }

    const user = jobRecord.user;
    const userPlan = user.effectivePlan || user.plan;
    
    try {
        emitProgress(jobId, 5, 'Job initiated...');
        
        // Download file from S3
        emitProgress(jobId, 10, 'Downloading and validating file...');
        const inputFileStream = await downloadFromS3(jobRecord.inputS3Key);
        
        // Parse CSV headers
        const { headers: originalHeaders, sampleData } = await parseHeadersAndSample(inputFileStream);
        
        console.log('Original headers from CSV:', originalHeaders);
        
        // // ENHANCEMENT: Optimize operations before processing
        // emitProgress(jobId, 20, 'Optimizing cleaning operations...');
        // const optimizedOperations = optimizeOperationSequence(jobRecord.operations);
        
        // console.log('Optimized operations:', {
        //     original: jobRecord.operations.length,
        //     optimized: optimizedOperations.length,
        //     operations: optimizedOperations.map(op => op.type)
        // });
        
        // // Process with optimized operations
        // emitProgress(jobId, 25, 'Applying optimized cleaning operations...');
        // const processingResult = await processCsvWithEnhancedStreaming(
        //     inputFileStream, 
        //     optimizedOperations, 
        //     originalHeaders, 
        //     userPlan,
        //     jobId,
        //     user.id
        // );

        // Use original operations directly
        const operationsToUse = jobRecord.operations;

        console.log('Operations to apply:', operationsToUse.map(op => op.type));

        // Process with original operations
        emitProgress(jobId, 25, 'Applying cleaning operations...');
        const processingResult = await processCsvWithEnhancedStreaming(
            inputFileStream, 
            operationsToUse, // ← using original operations
            originalHeaders, 
            userPlan,
            jobId,
            user.id
        );
        
        // Upload result to S3
        emitProgress(jobId, 90, 'Uploading cleaned file...');
        const outputKey = `cleaned/${user.id}/${uuidv4()}.csv`;
        await uploadToS3(processingResult.outputStream, outputKey);
        
        // Update job record with optimization info
        jobRecord.status = 'completed';
        jobRecord.outputS3Key = outputKey;
        jobRecord.completedAt = new Date();
        jobRecord.rowCount = processingResult.rowCount;
        jobRecord.finalHeaders = processingResult.finalHeaders;
        // jobRecord.optimizationReport = {
        //     originalOperationCount: jobRecord.operations.length,
        //     optimizedOperationCount: optimizedOperations.length,
        //     operationsRemoved: jobRecord.operations.length - optimizedOperations.length
        // };
        await jobRecord.save();
        
        emitProgress(jobId, 100, 'Job completed successfully!');
        
        logger.info('Job completed with optimization', {
            jobId: jobRecord._id,
            plan: userPlan,
            rowCount: processingResult.rowCount,
            originalOps: jobRecord.operations.length,
            optimizedOps: optimizedOperations.length,
            userId: user.id
        });
        
    } catch (error) {
        logger.error('Job processing failed', {
            jobId: jobRecord._id,
            error: error.message,
            userId: user.id
        });
        
        jobRecord.status = 'failed';
        jobRecord.errorMessage = error.message;
        jobRecord.failureReason = 'processing_error';
        await jobRecord.save();
        
        emitProgress(jobId, 0, `Error: ${error.message}`);
        throw error;
    }
};

/**
 * Enhanced streaming with operation optimization and duplicate prevention
 */
async function processCsvWithEnhancedStreaming(inputStream, operations, originalHeaders, userPlan, jobId, userId) {
    console.log('=== ENHANCED CLEANING STREAM INIT ===');
    console.log('Initial headers:', originalHeaders);
    console.log('Optimized operations:', operations.map(op => op.type));
    
    let rowCount = 0;
    const outputRows = [];
    
    try {
        // ENHANCEMENT: Pre-process operations to remove duplicates and conflicts
        const processedOperations = preprocessOperations(operations);
        
        console.log('Pre-processed operations:', {
            original: operations.length,
            processed: processedOperations.length,
            removed: operations.length - processedOperations.length
        });
        
        // Create the cleaning stream with processed operations
        const cleaningStream = createCleaningStream(processedOperations, originalHeaders);
        
        // Process the stream
        inputStream.pipe(cleaningStream);
        
        for await (const row of cleaningStream) {
            rowCount++;
            outputRows.push(row);
            
            // Progress updates for large files
            if (rowCount % 100 === 0) {
                const progress = 25 + Math.floor((rowCount / 1000) * 65);
                emitProgress(jobId, progress, `Processed ${rowCount} rows...`);
            }
        }
        
        console.log('=== ENHANCED STREAM COMPLETE ===');
        console.log('Total rows processed:', rowCount);
        
        // Apply free tier limitations
        const finalRows = applyPlanLimitations(outputRows, userPlan);
        
        // ENHANCEMENT: Get final headers from processed data
        const finalHeaders = getFinalHeaders(finalRows, originalHeaders);
        
        // Create output stream
        const outputStream = createCsvStream(finalRows, finalHeaders);
        
        return {
            outputStream,
            rowCount: finalRows.length,
            finalHeaders: finalHeaders,
            optimizationReport: {
                originalOperationCount: operations.length,
                processedOperationCount: processedOperations.length,
                rowsProcessed: rowCount
            }
        };
        
    } catch (error) {
        console.error('Enhanced streaming failed:', error);
        // Fallback to basic processing
        return await processCsvWithBasicStreaming(inputStream, operations, originalHeaders, userPlan, jobId, userId);
    }
}

/**
 * Basic streaming fallback
 */
async function processCsvWithBasicStreaming(inputStream, operations, originalHeaders, userPlan, jobId, userId) {
    console.log('Using basic streaming fallback');
    
    let rowCount = 0;
    const outputRows = [];
    
    const cleaningStream = createCleaningStream(operations, originalHeaders);
    
    inputStream.pipe(cleaningStream);
    
    for await (const row of cleaningStream) {
        rowCount++;
        outputRows.push(row);
        
        if (rowCount % 100 === 0) {
            const progress = 25 + Math.floor((rowCount / 1000) * 65);
            emitProgress(jobId, progress, `Processed ${rowCount} rows...`);
        }
    }
    
    const finalRows = applyPlanLimitations(outputRows, userPlan);
    const outputStream = createCsvStream(finalRows, originalHeaders);
    
    return {
        outputStream,
        rowCount: finalRows.length,
        finalHeaders: originalHeaders,
        optimizationReport: { usedBasicEngine: true }
    };
}

/**
 * ENHANCEMENT: Pre-process operations to remove duplicates and conflicts
 */
function preprocessOperations(operations) {
    if (!operations || operations.length === 0) return [];
    
    const uniqueOperations = [];
    const seenOperations = new Set();
    
    operations.forEach(op => {
        // Create unique key for deduplication
        const operationKey = `${op.type}:${JSON.stringify(op.params || {})}`;
        
        if (!seenOperations.has(operationKey)) {
            seenOperations.add(operationKey);
            uniqueOperations.push(op);
        }
    });
    
    // Remove conflicting operations (multiple trim operations)
    const hasTrimAll = uniqueOperations.some(op => op.type === 'trim_whitespace_all');
    const filteredOperations = hasTrimAll 
        ? uniqueOperations.filter(op => op.type !== 'trim_whitespace')
        : uniqueOperations;
    
    console.log('Operation preprocessing:', {
        original: operations.length,
        unique: uniqueOperations.length,
        filtered: filteredOperations.length
    });
    
    return filteredOperations;
}

/**
 * ENHANCEMENT: Extract final headers from processed data
 */
function getFinalHeaders(rows, originalHeaders) {
    if (!rows || rows.length === 0) return originalHeaders;
    
    // Get all unique keys from processed rows
    const allKeys = new Set();
    rows.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    const finalHeaders = Array.from(allKeys);
    
    console.log('Final headers detection:', {
        original: originalHeaders.length,
        final: finalHeaders.length,
        added: finalHeaders.filter(h => !originalHeaders.includes(h)),
        removed: originalHeaders.filter(h => !finalHeaders.includes(h))
    });
    
    return finalHeaders;
}

/**
 * Apply user plan limitations (free tier restrictions)
 */
function applyPlanLimitations(rows, userPlan) {
    if (userPlan === 'free' && rows.length > 500) {
        console.log(`Applying free tier limit: ${rows.length} -> 500 rows`);
        return rows.slice(0, 500);
    }
    return rows;
}

/**
 * Create CSV stream from rows and headers
 */
function createCsvStream(rows, headers) {
    // Convert rows to CSV string using simple method
    const csvHeaders = headers.join(',');
    const csvRows = rows.map(row => 
        headers.map(header => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
                ? `"${escaped}"` 
                : escaped;
        }).join(',')
    );
    
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    
    // Return as stream
    const { Readable } = require('stream');
    return Readable.from([csvContent]);
}

/**
 * Download file from S3
 */
async function downloadFromS3(key) {
    const command = new GetObjectCommand({
        Bucket: config.s3.bucketName,
        Key: key
    });
    
    const response = await s3Client.send(command);
    return response.Body;
}

/**
 * Upload file to S3
 */
async function uploadToS3(stream, key) {
    let csvContent = '';
    
    for await (const chunk of stream) {
        csvContent += chunk;
    }
    
    const command = new PutObjectCommand({
        Bucket: config.s3.bucketName,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv'
    });
    
    await s3Client.send(command);
    return key;
}

/**
 * Parse CSV headers and get sample data
 */
async function parseHeadersAndSample(stream) {
    return new Promise((resolve, reject) => {
        const sampleData = [];
        let headers = [];
        let rowCount = 0;
        
        const parser = parse({ skip_empty_lines: true });
        
        parser.on('readable', function() {
            let record;
            while ((record = parser.read()) !== null && rowCount < 10) {
                if (rowCount === 0) {
                    headers = record;
                } else {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = record[index] || '';
                    });
                    sampleData.push(row);
                }
                rowCount++;
            }
        });
        
        parser.on('end', () => {
            resolve({ headers, sampleData });
        });
        
        parser.on('error', reject);
        
        // Pipe the stream to parser
        stream.pipe(parser);
    });
}

// Export the worker function
export default processCsvJob;

// Maintain backward compatibility
export { processCsvJob };