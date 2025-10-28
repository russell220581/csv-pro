import express from 'express';
import { getStats, getVirusScanStatus, getChartData, getUsers, getFeedback } from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

// Apply both protection middlewares to all routes in this file
router.use(protect, isAdmin);

router.get('/stats', getStats);
router.get('/charts', getChartData);
router.get('/users', getUsers);
router.get('/feedback', getFeedback);

// For admin monitoring
router.get('/virus-scan-status', getVirusScanStatus);

export default router;