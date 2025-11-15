import express from 'express';
import passport from 'passport';
import { protect } from '../middleware/auth.js';
import { strictLimiter, lenientLimiter } from '../middleware/rateLimiter.js';
import {
    register,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword,
    getMe,
    verifyAuth,
    updateDetails,
    updatePassword,
    resendVerification,
    logout
} from '../controllers/authController.js';

const router = express.Router();

// --- Google OAuth Routes ---
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = req.user.getSignedToken();
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    }
);

router.post('/logout', protect, logout);

// --- Public Routes with Rate Limiting ---
router.post('/register', lenientLimiter, register);
router.post('/login', strictLimiter, login);
router.post('/forgotpassword', lenientLimiter, forgotPassword);
router.put('/resetpassword/:resetToken', strictLimiter, resetPassword);
router.post('/resend-verification', lenientLimiter, resendVerification);

// Verification link
router.get('/verify/:id/:token', verifyEmail);

// --- Protected Routes ---
router.get('/me', protect, getMe);
router.get('/verify', protect, verifyAuth);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

export default router;