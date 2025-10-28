import { Server } from 'socket.io';
import { Emitter } from '@socket.io/redis-emitter';
import Redis from 'ioredis';

// Create a new Redis client specifically for emitting events.
const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
});

// The Emitter connects to Redis and can send messages to Socket.IO rooms.
const emitter = new Emitter(redisClient);

/**
 * Emits a progress update to a specific job's room.
 * @param {string} jobId The ID of the job to send the update to.
 * @param {number} percentage The progress percentage (0-100).
 * @param {string} message The progress message.
 */
export const emitProgress = (jobId, percentage, message) => {
    console.log(`[BROADCASTER for Job ${jobId}] Progress: ${percentage}% - ${message}`);
    emitter.to(jobId).emit('progressUpdate', { percentage, message });
};

/**
 * Emits a final completion event for a job.
 * @param {string} jobId The ID of the completed job.
 */
export const emitJobCompleted = (jobId) => {
    emitter.to(jobId).emit('jobCompleted', { jobId });
};

/**
 * Emits a failure event for a job.
 * @param {string} jobId The ID of the failed job.
 * @param {object} errorDetails Details about the failure.
 */
export const emitJobFailed = (jobId, errorDetails) => {
    emitter.to(jobId).emit('jobFailed', errorDetails);
};