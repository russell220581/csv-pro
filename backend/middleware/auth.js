import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/index.js';

// Secure cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

const protect = async (req, res, next) => {
  let token;

  // Check cookie first, then header for backward compatibility
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    // Admin-as-premium logic
    if (req.user.role === 'admin') {
      req.user.plan = 'premium';
    }

    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Helper functions for cookies
const setAuthCookie = (res, token) => {
  res.cookie('token', token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie('token', getCookieOptions());
};

export { protect, setAuthCookie, clearAuthCookie };