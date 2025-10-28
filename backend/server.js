import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';

// --- Local Module Imports ---
import config from './config/index.js';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import { centralErrorHandler } from './middleware/error.js';
import requestLogger from './middleware/requestLogger.js';
import logger from './utils/logger.js';
import backupService from './services/backupService.js';

// --- Route Imports ---
import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import recipeRoutes from './routes/recipeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js';
import passport from 'passport';
import { configurePassport } from './config/passport.js';
import cookieParser from 'cookie-parser';

// --- One-Time Startup Service Imports ---
import { startCronJobs } from './services/cronService.js';
import { ensureBucketExists } from './services/s3Service.js';

// Add at the top of server.js
import fs from 'fs';
try {
    console.log('Checking cleaning-engine files:');
    console.log(fs.readdirSync('/app/packages/cleaning-engine/src/'));
} catch (e) {
    console.log('Error reading directory:', e.message);
}

// --- Initial Application Setup ---
// Load environment variables from .env file
dotenv.config();

// ... app initialization ...
const app = express();
configurePassport();
const server = http.createServer(app);
const io = initSocket(server);

// --- Connect to Database & Run Startup Tasks ---
// Establish the connection to MongoDB.
connectDB();

// Startup tasks with async handling
const startupTasks = async () => {
    await ensureBucketExists();
    
    // Ensure backup bucket exists and log status
    const backupReady = await backupService.ensureBackupBucket();
    if (!backupReady) {
        logger.warn('Backup system may not function properly - bucket setup failed');
    }
};
startupTasks().catch(error => {
    logger.error('Startup tasks failed', { error: error.message });
    process.exit(1);
});

// Initialize the cron job to reset user quotas monthly and start daily backups.
startCronJobs();

// --- Global Middleware ---
// Enable Cross-Origin Resource Sharing based on the client URL in the config.
app.use(cors({ 
    origin: [config.cors.clientUrl, 'http://localhost:5173'],
    credentials: true
}));
// Middleware to parse incoming JSON request bodies.
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use(passport.initialize());

// --- API Route Mounting ---
// All API endpoints are organized into their own route files and mounted here.
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/recipes', recipeRoutes);

// --- Central Error Handling Middleware ---
// This must be the LAST piece of middleware added. It catches all errors
// passed via next() from any of the routes or controllers.
app.use(centralErrorHandler);

// --- Start the Server ---
const PORT = config.port || 5000;

// We use server.listen() instead of app.listen() to start the combined HTTP/WebSocket server.
server.listen(PORT, () => logger.info(
    `Server running in ${config.env} mode on port ${PORT}`
));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection', { 
        error: err.message, 
        stack: err.stack 
    });
    server.close(() => process.exit(1));
});