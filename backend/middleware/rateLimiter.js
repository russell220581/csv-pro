import rateLimit from 'express-rate-limit';

// A strict limiter for sensitive actions like login and password reset attempts.
// Allows 10 requests per 15 minutes from a single IP.
export const strictLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10,
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
});

// A more lenient limiter for account creation and password reset requests.
// Allows 50 requests per hour from a single IP.
export const lenientLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many account-related requests from this IP, please try again after an hour.' },
});