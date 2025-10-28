import logger from '../utils/logger.js';

const centralErrorHandler = (err, req, res, next) => {
  // Structured logging instead of console.error
  logger.error('Request Error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'anonymous'
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.isJoi) {
    statusCode = 400;
    message = err.details[0].message;
  }

  if (err.statusCode === 413) {
    statusCode = 413;
    message = err.message;
  }

  // Keep same response format for clients
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

export { centralErrorHandler };