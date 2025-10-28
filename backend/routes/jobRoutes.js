import express from 'express';
import {
    initiateUpload,
    createJob,
    getAllUserJobs,
    getJobStatus,
    streamDownload, 
    deleteJob,
} from '../controllers/jobController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply the 'protect' middleware to all routes in this file.
// This ensures that only authenticated users can access these endpoints.
router.use(protect);

// --- Job Creation Workflow ---
router.post('/initiate-upload', initiateUpload);
router.post('/create', createJob);


// --- Job Management & Retrieval ---

// Get a list of all jobs for the currently authenticated user.
router.get('/', getAllUserJobs);

// Get the real-time status and failure details of a specific job.
router.get('/:id/status', getJobStatus);

// Securely stream a completed file to the user for download.
router.get('/:id/stream', streamDownload);

// Delete a job and its associated files from S3 and the database.
router.delete('/:id', deleteJob);


export default router;