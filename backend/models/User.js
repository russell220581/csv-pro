import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please provide a name"],
    },
    email: {
        type: String,
        required: [true, "Please provide an email"],
        unique: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            "Please provide a valid email"
        ]
    },
    password: {
        type: String,
        minlength: 6,
        select: false // Automatically exclude password from query results
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null values, but unique if set
    },
    avatar: {
        type: String, // To store the URL of the user's Google profile picture
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    plan: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
    },
    monthlyJobCount: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    stripeCustomerId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values, but unique if a value is present
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'canceled', 'incomplete', 'past_due', null],
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, { timestamps: true });

// --- Mongoose Middleware & Methods ---

// Hash password before saving the user model
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new) AND it actually exists.
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password with the hashed password in the database
userSchema.methods.matchPasswords = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate a signed JWT
userSchema.methods.getSignedToken = function () {
    return jwt.sign({ id: this._id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

// Method to generate and hash a password reset token
userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set token to expire in 15 minutes
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;