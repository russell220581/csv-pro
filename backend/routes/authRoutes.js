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
    updateDetails,
    updatePassword,
    resendVerification,
    logout
} from '../controllers/authController.js';

const router = express.Router();

// --- Google OAuth Routes ---
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'] // We ask for permission to see their profile and email
}));

// --- The Callback URL ---
// Google redirects the user back to this URL after they have authenticated.
// Passport's Google strategy will handle the profile data and call our callback function (from passport.js).
// If successful, 'req.user' will be populated with the user document.
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = req.user.getSignedToken();
        
        // Set httpOnly cookie
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

// Verification link does not need a strict limit as it's token-based.
router.get('/verify/:id/:token', verifyEmail);

// --- Protected Routes (already protected from spam by requiring a JWT) ---
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

export default router;