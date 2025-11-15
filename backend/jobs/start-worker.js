import { Worker } from 'bullmq';
import redisConnection from '../config/redis.js';
import processCsvJob from './worker.js';
import connectDB from '../config/db.js';
import config from '../config/index.js';

console.log('🟡 STARTING WORKER...');
console.log('🔍 Checking environment...');
console.log('Mongo URI exists:', !!config.mongo.uri);
console.log('Redis host:', config.redis.host);

// Connect to MongoDB
console.log('🔗 Connecting to MongoDB for worker...');
try {
    await connectDB();
    console.log('✅ MongoDB connected for worker');
} catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
}

console.log('🟡 Creating BullMQ worker...');

// Create the worker
const worker = new Worker('csv-processing-queue', processCsvJob, {
    connection: redisConnection,
    concurrency: 2
});

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
});

worker.on('active', (job) => {
    console.log(`🟢 Job ${job.id} is now active and processing`);
});

worker.on('stalled', (job) => {
    console.log(`🟡 Job ${job.id} has stalled`);
});

console.log('🚀 CSV Processing Worker is now listening for jobs...');
console.log('📊 Worker status: READY');