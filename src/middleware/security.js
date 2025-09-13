import { securityLogger } from '../utils/logger.js';

// Security middleware to detect and prevent common attacks
export const securityMiddleware = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  const ip = req.ip;
  const path = req.path;
  const method = req.method;
  
  // Detect suspicious patterns
  const suspiciousPatterns = [
    // SQL Injection patterns
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /(\%3D)|(=)[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    
    // XSS patterns
    /(<script[^>]*>.*?<\/script>)/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // Path traversal
    /(\.\.[\/\\]){3,}/gi,
    /[\/\\]\.\.$/gi,
    
    // Command injection
    /[;&\|`]/gi
  ];
  
  // Check URL and body for suspicious patterns
  const checkForThreats = (data) => {
    if (typeof data === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(data));
    }
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some(value => checkForThreats(value));
    }
    return false;
  };
  
  // Check URL parameters
  if (checkForThreats(req.url)) {
    securityLogger.logSuspiciousActivity(
      req.user?.id || 'anonymous',
      'MALICIOUS_REQUEST',
      { type: 'URL_INJECTION', url: req.url, method },
      ip
    );
    
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Request contains potentially malicious content'
    });
  }
  
  // Check request body
  if (req.body && checkForThreats(req.body)) {
    securityLogger.logSuspiciousActivity(
      req.user?.id || 'anonymous',
      'MALICIOUS_REQUEST',
      { type: 'BODY_INJECTION', method, path },
      ip
    );
    
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Request contains potentially malicious content'
    });
  }
  
  // Check for bot patterns in User-Agent
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /php/i
  ];
  
  if (userAgent && botPatterns.some(pattern => pattern.test(userAgent))) {
    // Allow legitimate bots but log for monitoring
    if (!userAgent.match(/googlebot|bingbot|slurp|duckduckbot/i)) {
      securityLogger.logSuspiciousActivity(
        req.user?.id || 'anonymous',
        'BOT_DETECTED',
        { userAgent, path, method },
        ip
      );
    }
  }
  
  // Check for missing or suspicious headers
  const requiredHeaders = ['user-agent', 'accept'];
  const missingHeaders = requiredHeaders.filter(header => !req.get(header));
  
  if (missingHeaders.length > 0) {
    securityLogger.logSuspiciousActivity(
      req.user?.id || 'anonymous',
      'MISSING_HEADERS',
      { missingHeaders, path, method },
      ip
    );
  }
  
  // Add security headers to response
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });
  
  // Detect and prevent clickjacking
  if (req.get('X-Frame-Options') || req.get('X-Requested-With') === 'XMLHttpRequest') {
    // This might be an attempt to bypass frame protection
    securityLogger.logSuspiciousActivity(
      req.user?.id || 'anonymous',
      'POTENTIAL_CLICKJACKING',
      { headers: req.headers, path, method },
      ip
    );
  }
  
  next();
};

// Middleware to validate request size and prevent DoS
export const requestSizeValidator = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE) || 10485760; // 10MB default
  
  if (req.get('content-length') && parseInt(req.get('content-length')) > maxSize) {
    securityLogger.logSuspiciousActivity(
      req.user?.id || 'anonymous',
      'OVERSIZED_REQUEST',
      { size: req.get('content-length'), maxSize, path: req.path },
      req.ip
    );
    
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request exceeds maximum allowed size'
    });
  }
  
  next();
};

// CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for API endpoints with proper authentication
  if (req.path.startsWith('/api/') && req.get('Authorization')) {
    return next();
  }
  
  const token = req.get('X-CSRF-Token') || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    securityLogger.logSuspiciousActivity(
      req.user?.id || 'anonymous',
      'CSRF_ATTACK',
      { path: req.path, method: req.method, hasToken: !!token },
      req.ip
    );
    
    return res.status(403).json({
      error: 'CSRF token mismatch',
      message: 'Invalid or missing CSRF token'
    });
  }
  
  next();
};