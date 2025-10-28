import User from '../models/User.js';
import Job from '../models/Job.js';
import Feedback from '../models/Feedback.js';
import { subDays } from 'date-fns';
import virusScanService from '../services/virusScanService.js';

// @desc Get dashboard stats
const getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalJobs = await Job.countDocuments();
        const premiumUsers = await User.countDocuments({ plan: 'premium' });
        const newUsers = await User.countDocuments({ createdAt: { $gte: subDays(new Date(), 30) } });

        res.status(200).json({
            success: true,
            data: { totalUsers, totalJobs, premiumUsers, newUsers },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get data for virus scan status
const getVirusScanStatus = async (req, res, next) => {
    try {
        const scanStats = virusScanService.getScanStats();
        res.status(200).json({ success: true, data: scanStats });
    } catch (error) {
        next(error);
    }
};

// @desc Get data for charts
const getChartData = async (req, res, next) => {
    try {
        const sevenDaysAgo = subDays(new Date(), 7);
        const userActivity = await User.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        const jobActivity = await Job.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        res.status(200).json({ success: true, data: { userActivity, jobActivity } });
    } catch (error) {
        next(error);
    }
};

// @desc Get all users with pagination and search
const getUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';

        const query = searchTerm ? { email: { $regex: searchTerm, $options: 'i' } } : {};
        
        const users = await User.find(query)
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);
        
        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get all users feedback
const getFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.find({})
            .populate('user', 'name email') // Get user's name and email
            .sort({ priority: -1, createdAt: -1 }); // Sort by high priority, then by newest

        res.status(200).json({ success: true, data: feedback });
    } catch (error) {
        next(error);
    }
};

export { getStats, getVirusScanStatus, getChartData, getUsers, getFeedback };