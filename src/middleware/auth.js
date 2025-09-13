/**
 * RobustTicketing - Authentication Middleware
 * JWT token verification and authorization
 */

import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Verify JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const userQuery = 'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL';
    const userResult = await query(userQuery, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    
    req.user = userResult.rows[0];
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'token_expired',
        message: 'Token has expired' 
      });
    }
    
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check user roles
export const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user roles
      const rolesQuery = 'SELECT role FROM user_roles WHERE user_id = $1';
      const rolesResult = await query(rolesQuery, [req.user.id]);
      const userRoles = rolesResult.rows.map(row => row.role);
      
      // Check if user has required role
      const hasRequiredRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: roles,
          current: userRoles
        });
      }
      
      req.user.roles = userRoles;
      next();
      
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userQuery = 'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL';
      const userResult = await query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }
    }
    
    next();
    
  } catch (error) {
    // Continue without authentication
    next();
  }
};

export default {
  authenticateToken,
  authorize,
  optionalAuth
};