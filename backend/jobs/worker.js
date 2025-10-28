import { Worker } from 'bullmq';
import { Transform, PassThrough } from 'stream';
import csvParser from 'csv-parser';
import { format as fastcsvFormat } from 'fast-csv';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// --- Local Application Module Imports ---
import connectDB from '../config/db.js';
import redisConnection from '../config/redis.js';
import { s3Client } from '../config/s3.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// ---  Import the broadcaster utility for real-time events ---
import { emitProgress, emitJobCompleted, emitJobFailed } from '../utils/broadcaster.js';

// --- Shared Cleaning Engine Import ---
import { createCleaningStream, operations } from '@cleaning-engine/node';

/**
 * The main processor function for each job in the queue.
 */
const processor = async (job) => {
    const { jobId } = job.data;
    logger.info('Worker starting job', { jobId }); // ← UPDATED
    
    let user, effectivePlan;
    let finalRowCount = 0;

    try {
        const mongoJob = await Job.findById(jobId).lean();
        if (!mongoJob) throw new Error(`Job ${jobId} not found.`);

        user = await User.findById(mongoJob.user).lean();
        if (!user) throw new Error(`User for job ${jobId} not found.`);

        if (mongoJob.virusScanResult && !mongoJob.virusScanResult.isClean && !mongoJob.virusScanResult.skipped) {
            logger.warn('Processing blocked - virus detected in file', {
                jobId,
                fileName: mongoJob.originalFileName,
                scanResult: mongoJob.virusScanResult.scanResult
            });
        
            const error = new Error('File rejected due to virus detection');
            error.failureReason = 'VIRUS_DETECTED';
            throw error;
        }
        
        effectivePlan = user.role === 'admin' ? 'premium' : user.plan;
        
        emitProgress(jobId, 5, 'Job initiated...');

        if (effectivePlan === 'free' && user.monthlyJobCount >= 10) {
            const error = new Error('Job quota limit reached at time of processing.');
            error.failureReason = 'QUOTA_LIMIT_JOBS';
            throw error;
        }

        await Job.updateOne({ _id: jobId }, { status: 'processing' });
        emitProgress(jobId, 10, 'Downloading and validating file...');

        const userRecipe = mongoJob.operations.filter(op => {
            const opInfo = operations[op.type];
            return opInfo && (!opInfo.isPremium || effectivePlan === 'premium');
        });

        // This promise encapsulates the entire streaming pipeline from download to upload.
        const outputS3Key = await new Promise(async (resolve, reject) => {
            try {
                const s3DownloadStream = (await s3Client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: mongoJob.inputS3Key }))).Body;

                const parser = csvParser();
                let cleaningStream;

                const counterStream = new Transform({
                    objectMode: true,
                    transform(row, encoding, callback) {
                        finalRowCount++;
                        if (effectivePlan === 'free' && finalRowCount > 500) {
                            const quotaError = new Error(`File processing stopped: Free Plan limit of 500 rows exceeded.`);
                            quotaError.failureReason = 'QUOTA_LIMIT_ROWS';
                            return callback(quotaError);
                        }
                        this.push(row);
                        callback();
                    }
                });

                // This is the key event. Once the headers are parsed, we build the rest of the pipeline.
                parser.on('headers', (headers) => {
                    try {
                        let finalHeaders = headers;
                        for (const op of userRecipe) {
                            const executor = operations[op.type]?.headerExecutor;
                            if (executor) finalHeaders = executor(finalHeaders, op.params);
                        }
                        
                        cleaningStream = createCleaningStream(userRecipe, headers);
                        const formatter = fastcsvFormat({ headers: finalHeaders });
                        const passThrough = new PassThrough(); // Connects the formatter output to the S3 upload body

                        const outputKey = `cleaned/${mongoJob.user}/${jobId}-${mongoJob.originalFileName}`;
                        const upload = new Upload({
                            client: s3Client,
                            params: {
                                Bucket: process.env.S3_BUCKET_NAME,
                                Key: outputKey,
                                Body: passThrough,
                                ContentType: 'text/csv',
                            },
                        });
                        
                        // Manually construct the full, single-use pipeline.
                        // This is the correct pattern for this scenario.
                        parser
                            .pipe(cleaningStream)
                            .on('error', reject) // Catch errors from the cleaning stream
                            .pipe(counterStream)
                            .on('error', reject) // Catch errors from the counter stream
                            .pipe(formatter)
                            .pipe(passThrough);

                        emitProgress(jobId, 25, 'Applying cleaning operations...');
                        
                        // Wait for the S3 upload to complete.
                        upload.done().then(() => {
                            emitProgress(jobId, 95, 'Finalizing job...');
                            resolve(outputKey); // Resolve the promise with the new S3 key
                        }).catch(reject); // Reject the main promise if upload fails
                    } catch (e) {
                        reject(e); // Reject if there's an error setting up the pipeline
                    }
                });

                // Attach error handlers to the initial streams
                parser.on('error', reject);
                s3DownloadStream.on('error', reject);
                
                // Start the entire process by piping the download stream into the parser.
                s3DownloadStream.pipe(parser);
            } catch (e) {
                reject(e);
            }
        });

        if (effectivePlan === 'free') {
            await User.findByIdAndUpdate(user._id, { $inc: { monthlyJobCount: 1 } });
        }

        await Job.updateOne({ _id: jobId }, { 
            status: 'completed', 
            outputS3Key: outputS3Key, // Save the S3 key we got from the promise
            rowCount: finalRowCount,
            failureReason: null,
        });

        emitProgress(jobId, 100, 'Job completed successfully!');
        emitJobCompleted(jobId);
        
        logger.info('Job completed successfully', { 
            jobId, 
            rowCount: finalRowCount,
            userId: user._id,
            plan: effectivePlan
        });

    } catch (err) {
        logger.error('Job processing failed', { 
            jobId,
            error: err.message,
            failureReason: err.failureReason,
            userId: user?._id
        });
        
        const reason = err.failureReason || 'INTERNAL_ERROR';
        
        await Job.updateOne({ _id: jobId }, { 
            status: 'failed', 
            errorMessage: err.message,
            failureReason: reason
        });
        
        emitJobFailed(jobId, { jobId, message: err.message, reason });
        
        throw err; // Re-throw the error to let BullMQ know the job failed.
    }
};

/**
 * Initializes and starts the BullMQ worker.
 */
const startWorker = async () => {
    await connectDB();
    
    const worker = new Worker('csv-processing-queue', processor, {
        connection: redisConnection,
        concurrency: 5, // Process up to 5 jobs at once
        settings: {
            stalledInterval: 120000,
            maxStalledCount: 1,
        },
    });

    worker.on('completed', (job) => {
        logger.info('Job completed in queue', { jobId: job.id }); // ← UPDATED
    });

    worker.on('failed', (job, err) => {
        logger.error('Job failed in queue', {
            jobId: job.id, 
            error: err.message 
        });
    });
    
    logger.info('Worker is listening for jobs...');
};

startWorker();