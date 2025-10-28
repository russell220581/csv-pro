import { S3Client } from '@aws-sdk/client-s3';
import config from './index.js'; // We only need to import the central config

// Plan limits for reference in controllers
const PLAN_LIMITS = {
    free: { fileSize: 5 * 1024 * 1024 }, // 5MB
    premium: { fileSize: 100 * 1024 * 1024 } // 100MB
};

// Configure and export the S3 Client using our central config object
const s3Client = new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
    },
    
    // This is crucial for MinIO to work correctly with bucket names in the path.
    forcePathStyle: true,
});

export { s3Client, PLAN_LIMITS };