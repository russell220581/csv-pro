import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/s3.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

const execAsync = promisify(exec);

class BackupService {
    constructor() {
        this.backupBucket = 'csv-pro-backups';
        this.retentionDays = 7;
    }

    async performBackup() {
        const backupDate = new Date().toISOString().split('T')[0];
        const backupFileName = `mongodb-backup-${backupDate}.tar.gz`;
        const tempDir = tmpdir();
        const backupPath = join(tempDir, backupFileName);

        try {
            logger.info('Starting database backup', { backupDate });

            // Create backup using mongodump
            await this.createMongoBackup(backupPath);
            
            // Upload to S3
            await this.uploadToS3(backupPath, backupFileName);
            
            // Clean up old backups
            await this.cleanupOldBackups();
            
            logger.info('Backup completed successfully', { backupDate });
            return { success: true, date: backupDate, file: backupFileName };

        } catch (error) {
            logger.error('Backup failed', { 
                backupDate, 
                error: error.message 
            });
            
            // Notify all users about backup failure
            await this.notifyUsersOfBackupFailure(backupDate, error.message);
            
            return { success: false, date: backupDate, error: error.message };
        } finally {
            // Clean up temporary file
            await this.cleanupTempFile(backupPath);
        }
    }

    async createMongoBackup(backupPath) {
        const command = `mongodump --uri="${config.mongo.uri}" --archive="${backupPath}" --gzip`;
        
        try {
            await execAsync(command);
            logger.info('MongoDB dump created successfully');
        } catch (error) {
            throw new Error(`MongoDB backup failed: ${error.message}`);
        }
    }

    async uploadToS3(backupPath, fileName) {
        try {
            const fs = await import('fs');
            const fileStream = fs.createReadStream(backupPath);
            
            const command = new PutObjectCommand({
                Bucket: this.backupBucket,
                Key: `backups/${fileName}`,
                Body: fileStream,
                ContentType: 'application/gzip'
            });

            await s3Client.send(command);
            logger.info('Backup uploaded to S3 successfully', { fileName });
        } catch (error) {
            throw new Error(`S3 upload failed: ${error.message}`);
        }
    }

    async cleanupOldBackups() {
        try {
            const listCommand = new ListObjectsV2Command({
                Bucket: this.backupBucket,
                Prefix: 'backups/'
            });

            const response = await s3Client.send(listCommand);
            
            if (!response.Contents) return;

            const now = new Date();
            const backupsToDelete = response.Contents.filter(object => {
                // Extract date from filename: mongodb-backup-2024-01-15.tar.gz
                const dateMatch = object.Key.match(/mongodb-backup-(\d{4}-\d{2}-\d{2})/);
                if (!dateMatch) return false;
                
                const backupDate = new Date(dateMatch[1]);
                const daysOld = (now - backupDate) / (1000 * 60 * 60 * 24);
                return daysOld > this.retentionDays;
            });

            for (const object of backupsToDelete) {
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: this.backupBucket,
                    Key: object.Key
                });
                await s3Client.send(deleteCommand);
                logger.info('Deleted old backup', { key: object.Key });
            }

            logger.info('Backup cleanup completed', { deletedCount: backupsToDelete.length });
        } catch (error) {
            logger.error('Backup cleanup failed', { error: error.message });
        }
    }

    async notifyUsersOfBackupFailure(backupDate, error) {
        try {
            // Get all users to notify
            const users = await User.find({}).select('email name');
            
            for (const user of users) {
                await this.sendBackupFailureEmail(user, backupDate, error);
            }
            
            logger.info('Backup failure notifications sent', { userCount: users.length });
        } catch (notificationError) {
            logger.error('Failed to send backup failure notifications', {
                error: notificationError.message
            });
        }
    }

    async sendBackupFailureEmail(user, backupDate, error) {
        const emailContent = `
            <h2>Action Required: CSV Pro Backup Issue</h2>
            <p>Hi ${user.name},</p>
            <p>We attempted to backup your data but encountered an issue.</p>
            <p><strong>Backup Date:</strong> ${backupDate}</p>
            <p><strong>Issue:</strong> ${error}</p>
            <p>Your current data remains safe and accessible. Our system will retry automatically.</p>
            <p>If this continues, please contact our support team.</p>
            <br>
            <p>Thank you,<br>CSV Pro Team</p>
        `;

        await sendEmail({
            to: user.email,
            subject: 'Action Required: Your CSV Pro Backup Failed',
            html: emailContent
        });
    }

    async cleanupTempFile(filePath) {
        // Clean up temporary backup file
        const fs = await import('fs/promises');
        try {
            await fs.unlink(filePath);
        } catch (error) {
            logger.warn('Failed to cleanup temp backup file', { error: error.message });
        }
    }

    async ensureBackupBucket() {
        try {
            const { CreateBucketCommand, HeadBucketCommand } = await import('@aws-sdk/client-s3');
            
            // Check if bucket exists
            try {
                await s3Client.send(new HeadBucketCommand({ Bucket: this.backupBucket }));
                logger.info('Backup bucket exists and is accessible');
                return true;
            } catch (error) {
                if (error.name === 'NotFound') {
                    // Bucket doesn't exist, create it
                    logger.info('Creating backup bucket', { bucket: this.backupBucket });
                    
                    const createCommand = new CreateBucketCommand({
                        Bucket: this.backupBucket,
                        // For MinIO compatibility, don't specify LocationConstraint
                    });
                    
                    await s3Client.send(createCommand);
                    logger.info('Backup bucket created successfully', { bucket: this.backupBucket });
                    return true;
                } else {
                    // Other error (permissions, etc.)
                    throw error;
                }
            }
        } catch (error) {
            logger.error('Backup bucket setup failed', {
                bucket: this.backupBucket,
                error: error.message
            });
            return false;
        }
    }
}

export default new BackupService();