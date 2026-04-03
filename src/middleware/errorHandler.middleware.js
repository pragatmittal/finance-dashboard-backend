/**
 * Centralized error handler.
 * All errors passed via next(err) land here.
 * Keeps error formatting consistent across the entire API.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details;

  // Mongoose: duplicate key (e.g., email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    statusCode = 409;
  }

  // Mongoose: validation errors (model-level)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(". ");
    statusCode = 400;
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose: invalid ObjectId format
  if (err.name === "CastError" && err.kind === "ObjectId") {
    message = `Invalid ID format: '${err.value}'`;
    statusCode = 400;
  }

  // JWT errors (if they bubble up)
  if (err.name === "JsonWebTokenError") {
    message = "Invalid token.";
    statusCode = 401;
  }
  if (err.name === "TokenExpiredError") {
    message = "Token expired. Please log in again.";
    statusCode = 401;
  }

  // Only log stack traces in development
  if (process.env.NODE_ENV === "development") {
    console.error(`[ERROR] ${err.stack}`);
  } else {
    console.error(`[ERROR] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(details && { errors: details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;