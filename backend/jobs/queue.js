import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

const fileQueue = new Queue('csv-processing-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
});

fileQueue.on('error', (err) => {
    console.error('BullMQ Queue Error:', err);
});

console.log('BullMQ queue "csv-processing-queue" is ready.');

export default fileQueue;