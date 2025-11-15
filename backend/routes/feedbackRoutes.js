import express from 'express';
import { submitFeedback } from '../controllers/feedbackController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes in this file are protected.
router.use(protect);

// Route for submitting feedback
router.post('/', submitFeedback);

export default router;