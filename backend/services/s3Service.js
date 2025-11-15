import { HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/s3.js';
import config from '../config/index.js';

/**
 * Ensures that the S3/MinIO bucket specified in the configuration exists.
 * If the bucket does not exist, it will be created.
 * This function is designed to be called once on server startup.
 */
const ensureBucketExists = async () => {
    const bucketName = config.s3.bucketName;
    console.log(`Checking for S3 bucket: "${bucketName}"...`);

    try {
        // The HeadBucketCommand is a lightweight way to check for a bucket's existence and your access to it.
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket "${bucketName}" already exists. Check complete.`);
    } catch (error) {
        // The SDK throws a specific error name ('NotFound' for v3) if the bucket doesn't exist.
        // We must check for this specific error.
        if (error.name === 'NotFound' || error.name === 'NoSuchBucket') {
            console.log(`Bucket "${bucketName}" not found. Attempting to create it...`);
            try {
                // If it doesn't exist, send the command to create it.
                await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
                console.log(`Successfully created bucket "${bucketName}".`);
            } catch (createError) {
                console.error(`FATAL ERROR: Failed to create bucket "${bucketName}". Please check your S3/MinIO credentials and permissions.`);
                console.error(createError);
                process.exit(1); // Exit with a failure code because the app cannot function without the bucket.
            }
        } else {
            // If the error is anything else (e.g., 'InvalidAccessKeyId', network error),
            // it's a critical configuration problem.
            console.error(`FATAL ERROR: Could not verify S3 bucket. Please check your S3/MinIO configuration and connection.`);
            console.error(error);
            process.exit(1); // Exit with a failure code.
        }
    }
};

export { ensureBucketExists };