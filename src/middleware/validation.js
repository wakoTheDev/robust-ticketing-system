/**
 * RobustTicketing - Validation Middleware
 * Request validation and sanitization
 */

import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

// Validation error formatter
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));
};

// Generic validation middleware
export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const errors = [];
      
      // Validate each field in schema
      for (const [field, rules] of Object.entries(schema)) {
        const value = req.body[field];
        
        // Required field validation
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({
            field,
            message: `${field} is required`,
            value
          });
          continue;
        }
        
        // Skip validation for optional empty fields
        if (!rules.required && (value === undefined || value === null || value === '')) {
          continue;
        }
        
        // Type validation
        if (rules.type) {
          switch (rules.type) {
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                errors.push({
                  field,
                  message: `${field} must be a valid email address`,
                  value
                });
              }
              break;
              
            case 'number':
              if (isNaN(value) || typeof value !== 'number') {
                errors.push({
                  field,
                  message: `${field} must be a number`,
                  value
                });
              }
              break;
              
            case 'boolean':
              if (typeof value !== 'boolean') {
                errors.push({
                  field,
                  message: `${field} must be a boolean`,
                  value
                });
              }
              break;
              
            case 'uuid':
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
              if (!uuidRegex.test(value)) {
                errors.push({
                  field,
                  message: `${field} must be a valid UUID`,
                  value
                });
              }
              break;
              
            case 'datetime':
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                errors.push({
                  field,
                  message: `${field} must be a valid datetime`,
                  value
                });
              }
              break;
              
            case 'array':
              if (!Array.isArray(value)) {
                errors.push({
                  field,
                  message: `${field} must be an array`,
                  value
                });
              }
              break;
          }
        }
        
        // String length validation
        if (typeof value === 'string') {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push({
              field,
              message: `${field} must be at least ${rules.minLength} characters long`,
              value
            });
          }
          
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({
              field,
              message: `${field} must be no more than ${rules.maxLength} characters long`,
              value
            });
          }
        }
        
        // Number range validation
        if (typeof value === 'number') {
          if (rules.min && value < rules.min) {
            errors.push({
              field,
              message: `${field} must be at least ${rules.min}`,
              value
            });
          }
          
          if (rules.max && value > rules.max) {
            errors.push({
              field,
              message: `${field} must be no more than ${rules.max}`,
              value
            });
          }
        }
        
        // Array validation
        if (Array.isArray(value)) {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push({
              field,
              message: `${field} must have at least ${rules.minLength} items`,
              value
            });
          }
          
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({
              field,
              message: `${field} must have no more than ${rules.maxLength} items`,
              value
            });
          }
          
          // Validate array items
          if (rules.items) {
            value.forEach((item, index) => {
              for (const [itemField, itemRules] of Object.entries(rules.items)) {
                const itemValue = item[itemField];
                
                if (itemRules.required && (itemValue === undefined || itemValue === null || itemValue === '')) {
                  errors.push({
                    field: `${field}[${index}].${itemField}`,
                    message: `${itemField} is required`,
                    value: itemValue
                  });
                }
                
                // Add more item validation as needed
              }
            });
          }
        }
        
        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({
            field,
            message: `${field} must be one of: ${rules.enum.join(', ')}`,
            value
          });
        }
      }
      
      if (errors.length > 0) {
        logger.warn('Validation failed', {
          url: req.url,
          method: req.method,
          errors,
          body: req.body
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }
      
      next();
      
    } catch (error) {
      logger.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Validation check failed' });
    }
  };
};

// Express-validator based validation
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());
    
    logger.warn('Express-validator validation failed', {
      url: req.url,
      method: req.method,
      errors: formattedErrors,
      body: req.body
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors
    });
  }
  
  next();
};

// Sanitize input
export const sanitizeInput = (req, res, next) => {
  try {
    // Basic string sanitization
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[<>]/g, '');
    };
    
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            typeof item === 'object' ? sanitizeObject(item) : sanitizeString(item)
          );
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };
    
    req.body = sanitizeObject(req.body);
    next();
    
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next();
  }
};

export default {
  validateRequest,
  handleValidationErrors,
  sanitizeInput
};