import Redis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';

const redisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
};

const redisConnection = new Redis(redisOptions);

redisConnection.on('connect', () => {
    logger.info('Redis connection established');
});

redisConnection.on('error', (err) => {
    logger.error(`Redis Connection Error: ${err.message}`);
});

export default redisConnection;