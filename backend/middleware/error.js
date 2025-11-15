import logger from "../utils/logger.js";

/**
 * Express global error handler.
 * Converts any thrown error into a clean JSON response.
 */
export function errorHandler(err, req, res, next) {
  // Default shape
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Structured log entry
  logger.error("Unhandled error", {
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    route: req.originalUrl,
    method: req.method,
  });

  // Send concise JSON to client
  res.status(statusCode).json({
    success: false,
    message:
      err.message ||
      "Unexpected server error. Our team has been notified.",
  });
}