import { logger, securityLogger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default error response
  let statusCode = err.statusCode || 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      statusCode = 400;
      message = 'Validation failed';
      details = isDevelopment ? err.details : null;
      break;
      
    case 'UnauthorizedError':
    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Unauthorized access';
      securityLogger.logSuspiciousActivity(
        req.user?.id || 'anonymous',
        'UNAUTHORIZED_ACCESS',
        { path: req.path, method: req.method },
        req.ip
      );
      break;
      
    case 'ForbiddenError':
      statusCode = 403;
      message = 'Access forbidden';
      securityLogger.logSuspiciousActivity(
        req.user?.id || 'anonymous',
        'FORBIDDEN_ACCESS',
        { path: req.path, method: req.method },
        req.ip
      );
      break;
      
    case 'NotFoundError':
      statusCode = 404;
      message = 'Resource not found';
      break;
      
    case 'ConflictError':
      statusCode = 409;
      message = 'Resource conflict';
      break;
      
    case 'RateLimitError':
      statusCode = 429;
      message = 'Too many requests';
      securityLogger.logSuspiciousActivity(
        req.user?.id || 'anonymous',
        'RATE_LIMIT_EXCEEDED',
        { path: req.path, method: req.method },
        req.ip
      );
      break;
      
    case 'PaymentError':
      statusCode = 402;
      message = 'Payment processing failed';
      break;
      
    default:
      if (err.message) {
        message = isDevelopment ? err.message : 'An error occurred';
      }
  }

  // Handle database errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message = 'Resource already exists';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Invalid reference';
        break;
      case '23502': // Not null violation
        statusCode = 400;
        message = 'Required field missing';
        break;
      case '42P01': // Undefined table
        statusCode = 500;
        message = 'Database configuration error';
        break;
    }
  }

  // Security headers for error responses
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  // Send error response
  const errorResponse = {
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Add error details in development
  if (isDevelopment) {
    errorResponse.details = details || err.message;
    errorResponse.stack = err.stack;
  }

  // Add request ID for tracking
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, name = 'AppError') {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'ValidationError');
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UnauthorizedError');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'ForbiddenError');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NotFoundError');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'ConflictError');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RateLimitError');
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment failed') {
    super(message, 402, 'PaymentError');
  }
}