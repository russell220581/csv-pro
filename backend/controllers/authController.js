import User from '../models/User.js';
import Token from '../models/Token.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import {
    validateRegistration,
    validateLogin,
    validateForgotPassword,
    validateResetPassword
} from '../middleware/validators.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

// @desc    Register a new user
const register = async (req, res, next) => {
    try {
        const { error } = validateRegistration(req.body);
        if (error) { error.statusCode = 400; return next(error); }

        const { name, email, password } = req.body;
        if (await User.findOne({ email })) {
            return res.status(409).json({ success: false, message: "User with this email already exists." });
        }

        const user = await User.create({ name, email, password });
        logger.info('User registered', { userId: user._id, email: user.email }); // ← REPLACED

        const verificationToken = crypto.randomBytes(32).toString("hex");
        // REMOVE: console.log(`1. RAW verification token generated: ${verificationToken}`);

        const tokenDoc = new Token({
            userId: user._id,
            token: verificationToken,
        });
        
        await tokenDoc.save();
        
        const verificationUrl = `${config.cors.clientUrl}/email-verification/${user._id}/${verificationToken}`;

        await sendEmail({
            to: user.email,
            subject: "Verify Your Email for CSV Pro",
            html: `<p>Welcome! Please click the link to verify your email:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`
        });

        res.status(201).json({ success: true, message: "Registration successful. Please check your email to verify your account." });
    } catch (error) {
        next(error);
    }
};

// @desc    Login a user
const login = async (req, res, next) => {
    try {
        const { error } = validateLogin(req.body);
        if (error) { error.statusCode = 400; return next(error); }
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select("+password");
        if (!user || !(await user.matchPasswords(password))) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: "Please verify your email address before logging in." });
        }
        const token = user.getSignedToken();
        
        // NEW: Set httpOnly cookie
        setAuthCookie(res, token);
        
        res.status(200).json({ success: true, token });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify user email
const verifyEmail = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            logger.warn('Email verification failed - user not found', { userId: req.params.id });
            return res.status(400).json({ success: false, message: "Invalid verification link: User not found." });
        }

        const hashedTokenFromUrl = crypto.createHash("sha256").update(req.params.token).digest("hex");
        
        const tokenDoc = await Token.findOne({ userId: user._id, token: hashedTokenFromUrl });
        
        if (!tokenDoc) {
            logger.warn('Email verification failed - invalid token', { userId: user._id }); // ← REPLACED
            return res.status(400).json({ success: false, message: "Invalid or expired verification link." });
        }

        logger.info('Email verification successful', { userId: user._id }); // ← REPLACED
        user.isVerified = true;
        await user.save();
        await Token.deleteOne({ _id: tokenDoc._id });
        
        const jwtToken = user.getSignedToken();
        setAuthCookie(res, jwtToken);
        
        res.status(200).json({ success: true, message: "Email verified successfully.", token: jwtToken });
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot password
const forgotPassword = async (req, res, next) => {
    try {
        const { error } = validateForgotPassword(req.body);
        if (error) { error.statusCode = 400; return next(error); }
        const user = await User.findOne({ email: req.body.email });
        if (user) {
            const resetToken = user.getResetPasswordToken();
            await user.save({ validateBeforeSave: false });
            const resetUrl = `${config.cors.clientUrl}/reset-password/${resetToken}`;
            await sendEmail({ to: user.email, subject: "Password Reset Request", html: `<h1>Password Reset</h1><p>Click <a href="${resetUrl}">here</a> to reset.</p>` });
        }
        res.status(200).json({ success: true, message: "If an account exists, an email has been sent." });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(200).json({ success: true, message: "If an account exists, an email has been sent." });
    }
};

// @desc    Reset password
const resetPassword = async (req, res, next) => {
    try {
        const { error } = validateResetPassword(req.body);
        if (error) { error.statusCode = 400; return next(error); }
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
        const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
        }
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(200).json({ success: true, message: "Password reset successful." });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
const getMe = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: req.user });
    } catch (error) {
        next(error);
    }
};

// --- Update User Details ---
const updateDetails = async (req, res, next) => {
    try {
        const { name } = req.body;
        // Email cannot be changed here for security reasons.
        const user = await User.findByIdAndUpdate(req.user.id, { name }, {
            new: true, // Return the updated document
            runValidators: true,
        });
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// --- Update User Password ---
const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        // We need to select the password field as it's excluded by default
        const user = await User.findById(req.user.id).select('+password');

        const isMatch = await user.matchPasswords(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        // The 'pre-save' hook on the User model will automatically hash this new password
        user.password = newPassword;
        await user.save();
        
        // It's good practice to not send back any user data here
        res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        next(error);
    }
};

const resendVerification = async (req, res, next) => {
    // This is a generic success message that is returned whether the user exists or not.
    // This prevents "email enumeration," where an attacker could use this endpoint
    // to discover which emails are registered with your service.
    const genericSuccessMessage = "If an unverified account with that email exists, a new verification link has been sent.";

    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const user = await User.findOne({ email });

        // If user exists AND is not yet verified...
        if (user && !user.isVerified) {
            // Delete any old, existing tokens for this user to prevent clutter.
            await Token.deleteMany({ userId: user._id });

            // Create and save a new verification token (same logic as registration).
            const verificationToken = crypto.randomBytes(32).toString("hex");
            await new Token({
                userId: user._id,
                token: verificationToken,
            }).save();

            // Send the new email.
            const verificationUrl = `${config.cors.clientUrl}/email-verification/${user._id}/${verificationToken}`;
            await sendEmail({
                to: user.email,
                subject: "Resend: Verify Your Email for CSV Pro",
                html: `<p>We received a request to resend your verification link. Please click the link to verify your email:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`
            });
        }

        // IMPORTANT: Always return success to prevent leaking user information.
        res.status(200).json({ success: true, message: genericSuccessMessage });

    } catch (error) {
        // Even if an error occurs, we still send back the generic success message.
        // We log the real error on the server for debugging.
        console.error("Error in resendVerification:", error);
        res.status(200).json({ success: true, message: genericSuccessMessage });
    }
};

const logout = async (req, res, next) => {
    try {
        clearAuthCookie(res);
        res.status(200).json({ success: true, message: "Logged out successfully." });
    } catch (error) {
        next(error);
    }
};

export { 
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
};