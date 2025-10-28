import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import Job from '../models/Job.js';
import fileQueue from '../jobs/queue.js';
import { s3Client as mainS3Client, PLAN_LIMITS } from '../config/s3.js';
import config from '../config/index.js';
import { recipeSchema } from '../utils/validationSchemas.js';
import logger from '../utils/logger.js';
import virusScanService from '../services/virusScanService.js';

import analysisService from '../services/analysisService.js';
import smartOperationService from '../services/smartOperationService.js';

const CRITICAL_OPERATIONS = [
    {
        type: 'trim_whitespace_all',
        params: {},
        isCritical: true,
        autoApplied: true
    },
    {
        type: 'remove_empty_rows', 
        params: {},
        isCritical: true,
        autoApplied: true
    },
    {
        type: 'standardize_headers',
        params: {},
        isCritical: true,
        autoApplied: true
    }
];

const createPublicS3Client = () => {
    if (!config.s3.publicEndpoint) {
        return mainS3Client;
    }
    return new S3Client({
        region: config.s3.region,
        endpoint: config.s3.publicEndpoint,
        credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
        },
        forcePathStyle: true,
    });
};

const initiateUpload = async (req, res, next) => {
    const user = req.user;
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
        return res.status(400).json({ success: false, message: 'Filename and contentType are required.' });
    }
    try {
        const publicS3Client = createPublicS3Client();
        const key = `originals/${user.id}/${uuidv4()}${path.extname(filename)}`;
        const conditions = [
            ['content-length-range', 1, PLAN_LIMITS[user.plan].fileSize],
            ['eq', '$Content-Type', contentType],
        ];
        const { url, fields } = await createPresignedPost(publicS3Client, {
            Bucket: config.s3.bucketName,
            Key: key,
            Conditions: conditions,
            Fields: { 'Content-Type': contentType },
            Expires: 300,
        });
        
        logger.info('Upload initiated', { 
            userId: user.id, 
            filename, 
            key,
            plan: user.plan 
        }); // ← ADDED
        
        res.status(200).json({ success: true, data: { url, fields, key } });
    } catch (error) {
        logger.error('Upload initiation failed', { 
            userId: user.id, 
            filename, 
            error: error.message 
        });
        next(error);
    }
};

const createJob = async (req, res, next) => {
    const user = req.user;
    const { s3Key, originalFileName, fileSize, operations } = req.body;
    if (!s3Key || !originalFileName || !fileSize || !operations) {
        return res.status(400).json({ success: false, message: 'Missing required job parameters.' });
    }
    try {
        // Perform virus scan on uploaded file
        const scanResult = await virusScanService.scanS3File(s3Key, originalFileName);
        
        if (!scanResult.isClean && !scanResult.skipped) {
            logger.warn('Virus detected in uploaded file', {
                jobS3Key: s3Key,
                fileName: originalFileName,
                userId: user.id,
                scanResult: scanResult.scanResult
            });
        }

        const userOperations = recipeSchema.parse(operations);
        
        // 1. Get file data for analysis (first 1000 rows for quick analysis)
        const sampleData = await this.getFileSample(s3Key, 1000);
        
        // 2. Analyze data for smart cleaning opportunities
        const analysisResults = await analysisService.analyzeData(
            sampleData.data, 
            sampleData.headers, 
            user.plan
        );
        
        // 3. Generate smart operations from analysis
        const smartOperations = smartOperationService.generateSmartOperations(
            analysisResults, 
            user.plan
        );
        
        // 4. Combine all operations: Critical + Smart + User
        const allOperations = [
            ...CRITICAL_OPERATIONS,
            ...smartOperations.map(op => ({ ...op, isSmart: true, autoApplied: true })),
            ...userOperations
        ];

        const newJob = await Job.create({
            user: user.id,
            originalFileName,
            inputFileSize: fileSize,
            inputS3Key: s3Key,
            operations: allOperations,
            virusScanResult: scanResult,
            analysisResults: { // Store analysis for reporting
                qualityScore: analysisResults.summary.dataQualityScore,
                autoAppliedCount: smartOperations.length,
                totalIssues: analysisResults.summary.totalIssues
            }
        });
        
        logger.info('Job created with smart operations', {
            jobId: newJob._id,
            userId: user.id,
            fileName: originalFileName,
            criticalOperations: CRITICAL_OPERATIONS.length,
            smartOperations: smartOperations.length,
            userOperations: userOperations.length,
            totalOperations: allOperations.length,
            dataQualityScore: analysisResults.summary.dataQualityScore
        });
        
        await fileQueue.add('process-csv', { jobId: newJob._id });
        
        res.status(202).json({ 
            success: true, 
            message: "Job accepted for processing.", 
            jobId: newJob._id,
            smartProcessing: {
                autoApplied: smartOperations.length,
                qualityScore: analysisResults.summary.dataQualityScore,
                issuesFound: analysisResults.summary.totalIssues
            }
        });
        
    } catch (error) {
        logger.error('Job creation failed', { 
            userId: user.id, 
            fileName: originalFileName,
            error: error.message 
        });
        next(error);
    }
};

const getAllUserJobs = async (req, res, next) => {
    try {
        const jobs = await Job.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: jobs });
    } catch (error) {
        next(error);
    }
};

const getJobStatus = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job || job.user.toString() !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        res.status(200).json({ success: true, data: { status: job.status, errorMessage: job.errorMessage, failureReason: job.failureReason } });
    } catch (error) {
        next(error);
    }
};

const streamDownload = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job || job.user.toString() !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        if (job.status !== 'completed' || !job.outputS3Key) {
            return res.status(400).json({ success: false, message: 'Job is not ready for download.' });
        }
        if (req.user.plan === 'free' && job.rowCount > 500) {
            return res.status(403).json({ success: false, message: `This file contains ${job.rowCount} rows. Free users can only download files up to 500 rows.`, upgradeRequired: true });
        }
        const originalBaseName = path.basename(job.originalFileName, path.extname(job.originalFileName));
        const cleanedFileName = `${originalBaseName}_cleaned.csv`;
        res.setHeader('Content-Disposition', `attachment; filename="${cleanedFileName}"`);
        res.setHeader('Content-Type', 'text/csv');
        const command = new GetObjectCommand({ Bucket: config.s3.bucketName, Key: job.outputS3Key });
        const { Body } = await mainS3Client.send(command);
        Body.pipe(res);
    } catch (error) {
        next(error);
    }
};

const deleteJob = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job || job.user.toString() !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        
        // Delete S3 files
        if (job.inputS3Key) {
            try {
                await mainS3Client.send(new DeleteObjectCommand({ 
                    Bucket: config.s3.bucketName, 
                    Key: job.inputS3Key 
                }));
                logger.info('Input file deleted from S3', { jobId: job._id, key: job.inputS3Key });
            } catch (s3Error) {
                logger.warn('Failed to delete input file from S3', { 
                    jobId: job._id, 
                    key: job.inputS3Key,
                    error: s3Error.message 
                });
                // Continue with deletion even if S3 delete fails
            }
        }
        
        if (job.outputS3Key) {
            try {
                await mainS3Client.send(new DeleteObjectCommand({ 
                    Bucket: config.s3.bucketName, 
                    Key: job.outputS3Key 
                }));
                logger.info('Output file deleted from S3', { jobId: job._id, key: job.outputS3Key });
            } catch (s3Error) {
                logger.warn('Failed to delete output file from S3', { 
                    jobId: job._id, 
                    key: job.outputS3Key,
                    error: s3Error.message 
                });
                // Continue with deletion even if S3 delete fails
            }
        }
        
        // Use deleteOne() instead of remove()
        await Job.deleteOne({ _id: job._id });
        
        logger.info('Job deleted successfully', { jobId: job._id, userId: req.user.id });
        res.status(200).json({ success: true, message: 'Job deleted successfully.' });
        
    } catch (error) {
        logger.error('Job deletion failed', { 
            jobId: req.params.id, 
            userId: req.user.id,
            error: error.message 
        });
        next(error);
    }
};

export {
    initiateUpload,
    createJob,
    getAllUserJobs,
    getJobStatus,
    streamDownload,
    deleteJob,
};