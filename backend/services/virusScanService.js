import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const execAsync = promisify(exec);

class VirusScanService {
    constructor() {
        this.isAvailable = false;
        this.enabled = config.virusScan.enabled;
        this.maxFileSize = config.virusScan.maxFileSize;
        this.failOpen = config.virusScan.failOpen;
        
        logger.info('Virus scan service initialized', {
            enabled: this.enabled,
            maxFileSize: this.maxFileSize,
            failOpen: this.failOpen
        });
        
        if (this.enabled) {
            this.checkClamAVAvailability();
        }
    }

    async checkClamAVAvailability() {
        try {
            await execAsync('clamscan --version');
            this.isAvailable = true;
            logger.info('ClamAV antivirus scanner is available');
        } catch (error) {
            logger.warn('ClamAV not available - proceeding without virus scanning', {
                error: error.message
            });
            this.isAvailable = false;
        }
    }

    async scanBuffer(buffer, filename = 'uploaded-file') {
        if (!this.enabled) {
            return { isClean: true, skipped: true, reason: 'disabled' };
        }

        // Check file size limit
        if (buffer.length > this.maxFileSize) {
            logger.warn('File too large for virus scan', {
                filename,
                size: buffer.length,
                maxSize: this.maxFileSize
            });
            return { isClean: true, skipped: true, reason: 'size_limit' };
        }

        if (!this.isAvailable) {
            logger.warn('Virus scan skipped - ClamAV not available');
            return { 
                isClean: this.failOpen, 
                skipped: true, 
                reason: 'scanner_unavailable' 
            };
        }

        const tempDir = tmpdir();
        const tempFilePath = join(tempDir, `scan-${Date.now()}-${filename}`);
        
        try {
            // Write buffer to temporary file for scanning
            const fs = await import('fs/promises');
            await fs.writeFile(tempFilePath, buffer);

            // Scan with ClamAV
            const { stdout, stderr } = await execAsync(`clamscan --no-summary "${tempFilePath}"`);
            
            // Clean up temp file
            await fs.unlink(tempFilePath);

            // ClamAV returns exit code 1 if virus found, 0 if clean
            const isClean = !stdout.includes('FOUND');
            
            if (isClean) {
                logger.info('File passed virus scan', { filename });
            } else {
                logger.warn('Virus detected in file', { 
                    filename, 
                    scanResult: stdout.trim() 
                });
            }

            return { 
                isClean, 
                scanResult: stdout.trim(),
                skipped: false 
            };

        } catch (error) {
            // Clean up temp file on error
            try {
                const fs = await import('fs/promises');
                await fs.unlink(tempFilePath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }

            logger.error('Virus scan failed', {
                filename,
                error: error.message
            });

            // Fail open - allow file if scan fails
            return { isClean: this.failOpen, error: error.message, skipped: true };
        }
    }

    async scanS3File(s3Key, filename) {
        if (!this.enabled) {
            return { isClean: true, skipped: true, reason: 'disabled' };
        }

        try {
            // Download file from S3 for scanning
            const { GetObjectCommand } = await import('@aws-sdk/client-s3');
            const { s3Client } = await import('../config/s3.js');
            
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key
            }));

            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            const fileBuffer = Buffer.concat(chunks);

            return await this.scanBuffer(fileBuffer, filename);

        } catch (error) {
            logger.error('S3 file virus scan failed', {
                s3Key,
                filename,
                error: error.message
            });

            return { 
                isClean: this.failOpen, 
                error: error.message, 
                skipped: true 
            };
        }
    }

    async scanStream(stream, filename = 'uploaded-file') {
        logger.info('Stream-based virus scan initiated', { filename });
        return { isClean: true, skipped: true, note: 'Stream scanning not implemented' };
    }

    getScanStats() {
        return {
            enabled: this.enabled,
            available: this.isAvailable,
            maxFileSize: this.maxFileSize,
            failOpen: this.failOpen
        };
    }
}

// Export singleton instance
export default new VirusScanService();