import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

// Create a new BullMQ queue named 'csv-processing-queue'.
// It's important to use a descriptive name.
// We pass the Redis connection instance we configured earlier.
const fileQueue = new Queue('csv-processing-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // Retry a failed job up to 3 times
        backoff: {
            type: 'exponential', // Use exponential backoff strategy for retries
            delay: 5000,       // Start with a 5-second delay
        },
    },
});

// Event listener for queue errors (e.g., Redis connection issues)
fileQueue.on('error', (err) => {
    console.error('BullMQ Queue Error:', err);
});

console.log('BullMQ queue "csv-processing-queue" is ready.');

export default fileQueue;