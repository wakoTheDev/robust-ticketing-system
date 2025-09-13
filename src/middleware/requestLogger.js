import { v4 as uuidv4 } from 'uuid';
import { performanceLogger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.requestId = uuidv4();
  
  // Add request ID to response headers
  res.set('X-Request-ID', req.requestId);
  
  // Record request start time
  const startTime = Date.now();
  
  // Extract client information
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    origin: req.get('Origin')
  };
  
  // Store client info on request for use in other middleware
  req.clientInfo = clientInfo;
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // Log API response performance
    performanceLogger.logApiResponse(
      req.method,
      req.path,
      res.statusCode,
      duration,
      req.user?.id
    );
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  // Override res.send to log response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log API response performance
    performanceLogger.logApiResponse(
      req.method,
      req.path,
      res.statusCode,
      duration,
      req.user?.id
    );
    
    // Call original send method
    return originalSend.call(this, data);
  };
  
  next();
};