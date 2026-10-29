import { logger } from "../utils/logger.js";

export function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);
  }
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    details: err.details || undefined,
  });
}
