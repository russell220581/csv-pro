import cron from 'node-cron';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import backupService from './backupService.js'; 

// Monthly reset function
const resetMonthlyQuotas = async () => {
    try {
        const result = await User.updateMany(
            {},
            { $set: { monthlyJobCount: 0 } }
        );
        logger.info('Monthly quotas reset', { usersAffected: result.modifiedCount });
    } catch (error) {
        logger.error('Failed to reset monthly quotas', { error: error.message });
    }
};

// Daily backup function
const performDailyBackup = async () => {
    try {
        logger.info('Starting scheduled daily backup');
        const result = await backupService.performBackup();
        
        if (result.success) {
            logger.info('Scheduled backup completed successfully', {
                date: result.date,
                file: result.file
            });
        } else {
            logger.error('Scheduled backup failed', {
                date: result.date,
                error: result.error
            });
        }
    } catch (error) {
        logger.error('Scheduled backup process failed', {
            error: error.message
        });
    }
};

const startMonthlyReset = () => {
    // Run at 00:00 on the 1st of every month
    cron.schedule('0 0 1 * *', resetMonthlyQuotas);
    logger.info('Monthly quota reset job scheduled');
};

// Daily backup scheduling
const startDailyBackup = () => {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', performDailyBackup);
    logger.info('Daily backup job scheduled (2:00 AM)');
};

const startCronJobs = () => {
    startMonthlyReset();
    startDailyBackup();
    logger.info('All cron jobs started');
};

export { startCronJobs, resetMonthlyQuotas, performDailyBackup };