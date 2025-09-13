/**
 * RobustTicketing - Authentication Routes (Simplified)
 * User authentication with basic functionality for development
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts. Please try again later.' }
});

// Mock database for development (replace with real database later)
const mockUsers = new Map();

// Helper function to generate JWT tokens
const generateTokens = (userId, email) => {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Validation schemas
const registerSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 8 },
  firstName: { required: true, minLength: 2, maxLength: 50 },
  lastName: { required: true, minLength: 2, maxLength: 50 }
};

const loginSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 1 }
};

// POST /api/auth/register - User registration
router.post('/register', 
  authLimit,
  validateRequest(registerSchema),
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      // Check if user already exists
      if (mockUsers.has(email)) {
        return res.status(409).json({ error: 'User already exists with this email' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = {
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        emailVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockUsers.set(email, user);
      
      // Generate tokens
      const tokens = generateTokens(userId, email);
      
      logger.info('User registered successfully', { userId, email });
      
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          phone,
          emailVerified: false
        },
        tokens
      });
      
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// POST /api/auth/login - User login
router.post('/login',
  authLimit,
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = mockUsers.get(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        logger.warn('Failed login attempt', { email, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate tokens
      const tokens = generateTokens(user.id, email);
      
      logger.info('User logged in successfully', { userId: user.id, email });
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          emailVerified: user.emailVerified
        },
        tokens
      });
      
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// POST /api/auth/logout - User logout
router.post('/logout', async (req, res) => {
  try {
    // In a real implementation, you would invalidate the token
    // For now, just acknowledge the logout
    
    logger.info('User logged out', { ip: req.ip });
    
    res.json({ message: 'Logout successful' });
    
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Find user
    const user = Array.from(mockUsers.values()).find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Generate new tokens
    const tokens = generateTokens(decoded.userId, decoded.email);
    
    logger.info('Token refreshed', { userId: decoded.userId });
    
    res.json({
      message: 'Token refreshed successfully',
      tokens
    });
    
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/profile - Get user profile (requires authentication)
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = Array.from(mockUsers.values()).find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;