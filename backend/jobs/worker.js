// Add database connection
import connectDB from '../config/db.js';

// Connect to database when worker starts  
connectDB().catch(console.error);

import { Job } from 'bullmq';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import csvParser from 'csv-parser';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { parse, isValid, format } from 'date-fns';

// IMPORT USER MODEL FIRST to register schema
import '../models/User.js';
import JobModel from '../models/Job.js';
import { s3Client, PLAN_LIMITS } from '../config/s3.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { emitProgress } from '../utils/broadcaster.js';

// Import global cleaning utilities
import { 
    cleanHeaders, 
    toTitleCase, 
    toSentenceCase, 
    toSmartCase, 
    slugify, 
    removeHtml, 
    cleanNumber,
    formatDate as formatDateUtil,
    formatPostalCode,
    formatPhoneNumber,
    extractAreaCode,
    isValidPhoneNumber,
    formatCurrency,
    extractDomain,
    normalizeUnicode,
    detectPhoneCountry,
    detectPostalCodeCountry,
    detectDateFormat
} from '@csvpro/cleaning-engine/utils/helpers';

// Import similarity utilities for duplicate detection
import { StreamingDuplicateDetector, ColumnDuplicateDetector } from '@csvpro/cleaning-engine/utils/similarity';

/**
 * CSV processing worker - ENHANCED GLOBAL CLEANING
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
        emitProgress(jobId, 10, 'Starting global cleaning job...');
        
        // Download file from S3
        emitProgress(jobId, 20, 'Downloading file...');
        const inputFileStream = await downloadFromS3(jobRecord.inputS3Key);
        
        // Process with enhanced global engine
        emitProgress(jobId, 30, 'Processing CSV data with global cleaning...');
        const { outputRows, finalHeaders } = await processWithGlobalEngine(
            inputFileStream, 
            jobRecord.operations,
            jobId
        );
        
        // Apply free tier limitations
        const finalRows = userPlan === 'free' && outputRows.length > 500 
            ? outputRows.slice(0, 500) 
            : outputRows;
        
        // Upload result to S3
        emitProgress(jobId, 80, 'Uploading cleaned file...');
        const outputKey = `cleaned/${user.id}/${uuidv4()}.csv`;
        await uploadCsvToS3(finalRows, finalHeaders, outputKey);
        
        // Update job record
        jobRecord.status = 'completed';
        jobRecord.outputS3Key = outputKey;
        jobRecord.completedAt = new Date();
        jobRecord.rowCount = finalRows.length;
        jobRecord.finalHeaders = finalHeaders;
        await jobRecord.save();

        // Send completion events
        emitProgress(jobId, 100, 'Global cleaning completed successfully!');
        
        // Send jobCompleted event to trigger frontend download button
        const { emitJobCompleted } = await import('../utils/broadcaster.js');
        emitJobCompleted(jobRecord._id.toString(), {
            rowCount: finalRows.length,
            fileName: jobRecord.originalFileName
        });
        
        logger.info('Global cleaning job completed', {
            jobId: jobRecord._id,
            plan: userPlan,
            rowCount: finalRows.length,
            userId: user.id
        });
        
    } catch (error) {
        logger.error('Global cleaning job failed', {
            jobId: jobRecord._id,
            error: error.message,
            userId: user.id
        });
        
        jobRecord.status = 'failed';
        jobRecord.errorMessage = error.message;
        await jobRecord.save();
        
        emitProgress(jobId, 0, `Error: ${error.message}`);
        throw error;
    }
};

/**
 * Enhanced global processing engine with all operations
 */
async function processWithGlobalEngine(inputStream, operations, jobId) {
    return new Promise((resolve, reject) => {
        const outputRows = [];
        let headers = [];
        let rowCount = 0;
        let processedCount = 0;
        
        // Enhanced state management for global operations
        const state = {
            duplicates: new Map(),
            seenValues: new Map(),
            similarityGroups: new Map(),
            fuzzyDetectors: new Map(),
            columnDetectors: new Map(),
            phoneCountries: new Map(),
            dateFormats: new Map()
        };

        const parser = csvParser({ skip_empty_lines: true });
        
        parser.on('headers', (receivedHeaders) => {
            headers = receivedHeaders;
            console.log('Global cleaning - Initial headers:', headers);
            
            // Initialize stateful detectors for relevant operations
            initializeGlobalDetectors(operations, headers, state);
        });
        
        parser.on('data', (row) => {
            let processedRow = { ...row };
            let shouldInclude = true;
            
            try {
                // Apply operations sequentially with global context
                for (const operation of operations) {
                    const result = applyGlobalOperation(processedRow, operation, headers, state, rowCount);
                    
                    if (result.filteredOut) {
                        shouldInclude = false;
                        break;
                    }
                    
                    processedRow = result.row;
                }
                
                if (shouldInclude) {
                    outputRows.push(processedRow);
                    processedCount++;
                }
                
                rowCount++;
                
                // Progress updates
                if (rowCount % 50 === 0) {
                    const progress = 30 + Math.floor((rowCount / 1000) * 50);
                    emitProgress(jobId, Math.min(progress, 80), `Globally processed ${rowCount} rows...`);
                }
            } catch (error) {
                console.error(`Global processing error at row ${rowCount}:`, error);
                // Continue with next row even if one fails
            }
        });
        
        parser.on('end', () => {
            console.log('Global cleaning complete:', { 
                totalRows: rowCount, 
                processedRows: processedCount,
                filteredOut: rowCount - processedCount 
            });
            resolve({ outputRows, finalHeaders: headers });
        });
        
        parser.on('error', reject);
        
        inputStream.pipe(parser);
    });
}

/**
 * Initialize global detectors for stateful operations
 */
function initializeGlobalDetectors(operations, headers, state) {
    operations.forEach(op => {
        if (op.type === 'fuzzy_remove_duplicates' && op.params?.columns) {
            const key = JSON.stringify(op.params.columns.sort());
            if (!state.fuzzyDetectors.has(key)) {
                state.fuzzyDetectors.set(key, new StreamingDuplicateDetector(op.params.columns, op.params));
            }
        }
        
        if (op.type === 'column_level_deduplication' && op.params?.column) {
            if (!state.columnDetectors.has(op.params.column)) {
                state.columnDetectors.set(op.params.column, new ColumnDuplicateDetector(op.params.column, op.params));
            }
        }
    });
}

/**
 * Apply a single operation with global context
 */
function applyGlobalOperation(row, operation, headers, state, rowIndex) {
    let processedRow = { ...row };
    let filteredOut = false;

    try {
        switch (operation.type) {
            case 'standardize_headers':
                // Headers processed at stream level
                break;

            case 'trim_whitespace_all':
                Object.keys(processedRow).forEach(key => {
                    if (processedRow[key] && typeof processedRow[key] === 'string') {
                        processedRow[key] = processedRow[key].trim();
                    }
                });
                break;

            case 'trim_whitespace':
                if (operation.params?.column) {
                    const column = operation.params.column;
                    if (processedRow[column] && typeof processedRow[column] === 'string') {
                        processedRow[column] = processedRow[column].trim();
                    }
                }
                break;

            case 'remove_empty_rows':
                const isEmpty = Object.values(processedRow).every(val => 
                    !val || String(val).trim() === ''
                );
                if (isEmpty) filteredOut = true;
                break;

            case 'remove_empty_cells':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const value = String(processedRow[operation.params.column]).trim();
                    if (value === '') processedRow[operation.params.column] = '';
                }
                break;

            case 'remove_columns':
                if (operation.params?.columns) {
                    operation.params.columns.forEach(column => {
                        delete processedRow[column];
                    });
                }
                break;

            case 'change_case':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const value = String(processedRow[operation.params.column]);
                    if (operation.params.case === 'uppercase') {
                        processedRow[operation.params.column] = value.toUpperCase();
                    } else if (operation.params.case === 'lowercase') {
                        processedRow[operation.params.column] = value.toLowerCase();
                    }
                }
                break;

            case 'smart_case_conversion':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = toSmartCase(processedRow[operation.params.column]);
                }
                break;

            case 'format_name_titlecase':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = toTitleCase(processedRow[operation.params.column]);
                }
                break;

            case 'format_sentence_case':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = toSentenceCase(processedRow[operation.params.column]);
                }
                break;

            case 'format_email':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const email = String(processedRow[operation.params.column]).trim().toLowerCase();
                    processedRow[operation.params.column] = email;
                }
                break;

            case 'smart_format_phone':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = formatPhoneNumber(processedRow[operation.params.column], 'auto');
                }
                break;

            case 'format_phone':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    try {
                        const phoneNumber = parsePhoneNumberFromString(
                            String(processedRow[operation.params.column]),
                            operation.params.country
                        );
                        if (phoneNumber && phoneNumber.isValid()) {
                            processedRow[operation.params.column] = phoneNumber.format(operation.params.format);
                        }
                    } catch (error) {
                        // Keep original value
                    }
                }
                break;

            case 'format_date':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = formatDateUtil(
                        processedRow[operation.params.column],
                        operation.params.format
                    );
                }
                break;

            case 'smart_format_postal_code':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = formatPostalCode(
                        processedRow[operation.params.column],
                        'auto'
                    );
                }
                break;

            case 'clean_numbers':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = cleanNumber(processedRow[operation.params.column]);
                }
                break;

            case 'format_currency':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const number = cleanNumber(processedRow[operation.params.column]);
                    if (!isNaN(number) && isFinite(number)) {
                        processedRow[operation.params.column] = new Intl.NumberFormat(
                            operation.params.locale || 'en-US', 
                            {
                                style: 'currency',
                                currency: operation.params.currency,
                            }
                        ).format(number);
                    }
                }
                break;

            case 'remove_non_numeric':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const value = String(processedRow[operation.params.column]).trim();
                    if (isNaN(parseFloat(value)) || !isFinite(value)) {
                        processedRow[operation.params.column] = '';
                    }
                }
                break;

            case 'standardize_boolean':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const value = String(processedRow[operation.params.column]).toLowerCase().trim();
                    const trueValues = ['true', 'yes', '1', 'y', 'oui', 'si', 'ja', '是'];
                    const falseValues = ['false', 'no', '0', 'n', 'non', 'nein', '否'];
                    
                    if (trueValues.includes(value)) processedRow[operation.params.column] = 'true';
                    else if (falseValues.includes(value)) processedRow[operation.params.column] = 'false';
                }
                break;

            case 'standardize_columns':
                headers.forEach(header => {
                    if (!(header in processedRow)) processedRow[header] = '';
                });
                Object.keys(processedRow).forEach(key => {
                    if (!headers.includes(key)) delete processedRow[key];
                });
                break;

            case 'remove_duplicates':
                if (operation.params?.columns) {
                    const key = operation.params.columns
                        .map(col => String(processedRow[col] || '').toLowerCase().trim())
                        .join('|');
                    
                    if (!state.duplicates.has(key)) {
                        state.duplicates.set(key, true);
                    } else {
                        filteredOut = true;
                    }
                }
                break;

            case 'fuzzy_remove_duplicates':
                if (operation.params?.columns) {
                    const uniqueKey = JSON.stringify(operation.params.columns.sort());
                    const detector = state.fuzzyDetectors.get(uniqueKey);
                    if (detector) {
                        const result = detector.processRow(processedRow, rowIndex);
                        if (result.isDuplicate && !result.keep) filteredOut = true;
                    }
                }
                break;

            case 'column_level_deduplication':
                if (operation.params?.column) {
                    const detector = state.columnDetectors.get(operation.params.column);
                    if (detector) {
                        const result = detector.processRow(processedRow, rowIndex);
                        if (!result.keep) filteredOut = true;
                    }
                }
                break;

            case 'find_and_replace':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const find = operation.params.find;
                    const replace = operation.params.replace;
                    const regex = new RegExp(find, 'gi');
                    processedRow[operation.params.column] = String(processedRow[operation.params.column])
                        .replace(regex, replace);
                }
                break;

            case 'remove_html':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = removeHtml(processedRow[operation.params.column]);
                }
                break;

            case 'convert_to_slug':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[operation.params.column] = slugify(processedRow[operation.params.column]);
                }
                break;

            case 'extract_domain':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    processedRow[`${operation.params.column}_domain`] = extractDomain(processedRow[operation.params.column]);
                }
                break;

            case 'validate_email':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const email = String(processedRow[operation.params.column]).trim();
                    if (!isEmail(email)) processedRow[operation.params.column] = '';
                }
                break;

            case 'validate_phone':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const phone = String(processedRow[operation.params.column]).trim();
                    const country = detectPhoneCountry(phone);
                    try {
                        const phoneNumber = parsePhoneNumberFromString(phone, country);
                        if (!phoneNumber || !phoneNumber.isValid()) processedRow[operation.params.column] = '';
                    } catch {
                        processedRow[operation.params.column] = '';
                    }
                }
                break;

            case 'validate_postal_code':
                if (operation.params?.column && processedRow[operation.params.column]) {
                    const country = operation.params.country || 'US';
                    if (!isPostalCode(processedRow[operation.params.column], country.toUpperCase())) {
                        processedRow[operation.params.column] = '';
                    }
                }
                break;

            // Add more global operations as needed...

            default:
                console.warn(`Unknown global operation type: ${operation.type}`);
        }
    } catch (error) {
        console.error(`Error applying global operation ${operation.type}:`, error);
    }

    return { row: processedRow, filteredOut };
}

/**
 * Upload CSV to S3
 */
async function uploadCsvToS3(rows, headers, key) {
    const csvContent = convertToCsv(rows, headers);
    
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
 * Convert rows to CSV string
 */
function convertToCsv(rows, headers) {
    if (rows.length === 0) return headers.join(',');
    
    const csvHeaders = headers.join(',');
    const csvRows = rows.map(row => 
        headers.map(header => {
            const value = row[header] || '';
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
                ? `"${escaped}"` 
                : escaped;
        }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
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

export default processCsvJob;
export { processCsvJob };