import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'robust-ticketing',
    environment: process.env.NODE_ENV 
  },
  transports: [
    // Console logging for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'test'
    }),
    
    // File logging for all levels
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Security logging function
export const securityLogger = {
  logFailedLogin: (email, ip, userAgent) => {
    logger.warn('Failed login attempt', {
      event: 'FAILED_LOGIN',
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  logSuccessfulLogin: (userId, email, ip, userAgent) => {
    logger.info('Successful login', {
      event: 'SUCCESSFUL_LOGIN',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  logSuspiciousActivity: (userId, activity, details, ip) => {
    logger.warn('Suspicious activity detected', {
      event: 'SUSPICIOUS_ACTIVITY',
      userId,
      activity,
      details,
      ip,
      timestamp: new Date().toISOString()
    });
  },
  
  logDataAccess: (userId, resource, action, ip) => {
    logger.info('Data access', {
      event: 'DATA_ACCESS',
      userId,
      resource,
      action,
      ip,
      timestamp: new Date().toISOString()
    });
  },
  
  logSecurityEvent: (event, details) => {
    logger.warn('Security event', {
      event: 'SECURITY_EVENT',
      type: event,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance logging
export const performanceLogger = {
  logSlowQuery: (query, duration, params) => {
    logger.warn('Slow database query', {
      event: 'SLOW_QUERY',
      query,
      duration,
      params,
      timestamp: new Date().toISOString()
    });
  },
  
  logApiResponse: (method, path, statusCode, duration, userId) => {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger[level]('API response', {
      event: 'API_RESPONSE',
      method,
      path,
      statusCode,
      duration,
      userId,
      timestamp: new Date().toISOString()
    });
  }
};

// Business logging
export const businessLogger = {
  logTicketPurchase: (userId, eventId, ticketTypeId, quantity, amount) => {
    logger.info('Ticket purchase', {
      event: 'TICKET_PURCHASE',
      userId,
      eventId,
      ticketTypeId,
      quantity,
      amount,
      timestamp: new Date().toISOString()
    });
  },
  
  logEventCreation: (userId, eventId, title) => {
    logger.info('Event created', {
      event: 'EVENT_CREATED',
      userId,
      eventId,
      title,
      timestamp: new Date().toISOString()
    });
  },
  
  logRefund: (userId, orderId, amount, reason) => {
    logger.info('Refund processed', {
      event: 'REFUND_PROCESSED',
      userId,
      orderId,
      amount,
      reason,
      timestamp: new Date().toISOString()
    });
  }
};

export { logger };
export default logger;