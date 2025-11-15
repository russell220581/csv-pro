import Redis from 'ioredis';

// Create Redis clients for publishing
const redisPublisher = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
});

/**
 * Emits a progress update via Redis Pub/Sub
 */
export const emitProgress = (jobId, percentage, message) => {
    console.log(`[BROADCASTER for Job ${jobId}] Progress: ${percentage}% - ${message}`);
    redisPublisher.publish(`job:${jobId}`, JSON.stringify({
        type: 'progress',
        percentage,
        message
    }));
};

export const emitJobCompleted = (jobId, data = {}) => {
    redisPublisher.publish(`job:${jobId}`, JSON.stringify({
        type: 'completed',
        jobId,
        ...data
    }));
};

export const emitJobFailed = (jobId, errorDetails) => {
    redisPublisher.publish(`job:${jobId}`, JSON.stringify({
        type: 'failed',
        ...errorDetails
    }));
};