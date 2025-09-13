/**
 * RobustTicketing - User Routes
 * User profile and account management endpoints
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/avatars'),
  filename: (req, file, cb) => {
    const uniqueName = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// GET /api/users/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT id, email, first_name, last_name, phone, date_of_birth, 
             profile_image_url, email_verified, two_factor_enabled, 
             created_at, updated_at
      FROM users 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        dateOfBirth: user.date_of_birth,
        profileImageUrl: user.profile_image_url,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
    
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, dateOfBirth } = req.body;
    
    const query = `
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3, date_of_birth = $4, updated_at = NOW()
      WHERE id = $5 AND deleted_at IS NULL
      RETURNING id, email, first_name, last_name, phone, date_of_birth, 
                profile_image_url, email_verified, two_factor_enabled, 
                created_at, updated_at
    `;
    
    const values = [firstName, lastName, phone || null, dateOfBirth || null, userId];
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        dateOfBirth: user.date_of_birth,
        profileImageUrl: user.profile_image_url,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/avatar - Upload avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const query = `
      UPDATE users 
      SET profile_image_url = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING profile_image_url
    `;
    
    const result = await db.query(query, [avatarUrl, userId]);
    
    res.json({
      profileImageUrl: result.rows[0].profile_image_url,
      message: 'Avatar updated successfully'
    });
    
  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;