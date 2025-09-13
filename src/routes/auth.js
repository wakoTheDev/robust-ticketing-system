import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { validateRequest } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Too many registration attempts, please try again later',
    retryAfter: 60 * 60
  }
});

// Validation middleware
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be 8+ characters with uppercase, lowercase, number, and special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name is required and must contain only letters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name is required and must contain only letters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid date of birth is required')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

// Helper function to generate JWT tokens
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'robusttickets.com',
    audience: 'robusttickets-users'
  });
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',
      issuer: 'robusttickets.com',
      audience: 'robusttickets-users'
    }
  );
  
  return { accessToken, refreshToken };
};

// User registration
router.post('/register', registerLimiter, registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { email, password, firstName, lastName, phone, dateOfBirth } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  
  // Check if user already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  
  if (existingUser.rows.length > 0) {
    securityLogger.logSuspiciousActivity(
      null,
      'DUPLICATE_REGISTRATION',
      { email, ip, userAgent },
      ip
    );
    throw new ConflictError('User with this email already exists');
  }
  
  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // Create user
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, first_name, last_name, role, created_at`,
    [email, passwordHash, firstName, lastName, phone, dateOfBirth]
  );
  
  const user = result.rows[0];
  
  // Generate email verification token
  const verificationToken = jwt.sign(
    { id: user.id, email: user.email, type: 'email_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Send verification email
  try {
    await sendEmail({
      to: email,
      subject: 'Verify your RobustTicketing account',
      template: 'email-verification',
      data: {
        firstName,
        verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
      }
    });
  } catch (error) {
    // Log email error but don't fail registration
    console.error('Failed to send verification email:', error);
  }
  
  // Generate tokens
  const tokens = generateTokens(user);
  
  // Log successful registration
  businessLogger.logUserRegistration(user.id, email, ip, userAgent);
  
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email for verification.',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: false
    },
    tokens
  });
}));

// User login
router.post('/login', authLimiter, loginValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { email, password, rememberMe } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  
  // Get user from database
  const result = await query(
    `SELECT id, email, password_hash, first_name, last_name, role, email_verified,
            login_attempts, locked_until, two_factor_enabled, two_factor_secret
     FROM users WHERE email = $1`,
    [email]
  );
  
  const user = result.rows[0];
  
  if (!user) {
    securityLogger.logFailedLogin(email, ip, userAgent);
    throw new UnauthorizedError('Invalid credentials');
  }
  
  // Check if account is locked
  if (user.locked_until && new Date() < user.locked_until) {
    securityLogger.logSuspiciousActivity(
      user.id,
      'LOGIN_ATTEMPT_LOCKED_ACCOUNT',
      { email, lockUntil: user.locked_until },
      ip
    );
    throw new UnauthorizedError('Account is temporarily locked due to multiple failed login attempts');
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!isValidPassword) {
    // Increment login attempts
    const newAttempts = (user.login_attempts || 0) + 1;
    const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // Lock for 30 minutes after 5 attempts
    
    await query(
      'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
      [newAttempts, lockUntil, user.id]
    );
    
    securityLogger.logFailedLogin(email, ip, userAgent);
    throw new UnauthorizedError('Invalid credentials');
  }
  
  // Reset login attempts on successful login
  await query(
    'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );
  
  // Handle two-factor authentication
  if (user.two_factor_enabled) {
    const twoFactorToken = jwt.sign(
      { id: user.id, email: user.email, type: 'two_factor_pending' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );
    
    return res.json({
      success: true,
      requiresTwoFactor: true,
      token: twoFactorToken,
      message: 'Please enter your two-factor authentication code'
    });
  }
  
  // Generate tokens
  const tokens = generateTokens(user);
  
  // Log successful login
  securityLogger.logSuccessfulLogin(user.id, email, ip, userAgent);
  
  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled
    },
    tokens
  });
}));

// Two-factor authentication verification
router.post('/verify-2fa', authLimiter, [
  body('token').isLength({ min: 1 }).withMessage('2FA token is required'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit code is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { token, code } = req.body;
  
  // Verify 2FA token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'two_factor_pending') {
      throw new Error('Invalid token type');
    }
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
  
  // Get user and verify 2FA code
  const result = await query(
    'SELECT id, email, first_name, last_name, role, email_verified, two_factor_secret FROM users WHERE id = $1',
    [decoded.id]
  );
  
  const user = result.rows[0];
  if (!user) {
    throw new UnauthorizedError('User not found');
  }
  
  // Verify OTP code
  const isValidCode = verifyOTP(user.two_factor_secret, code);
  if (!isValidCode) {
    securityLogger.logSuspiciousActivity(
      user.id,
      'INVALID_2FA_CODE',
      { email: user.email },
      req.ip
    );
    throw new UnauthorizedError('Invalid verification code');
  }
  
  // Generate tokens
  const tokens = generateTokens(user);
  
  securityLogger.logSuccessfulLogin(user.id, user.email, req.ip, req.get('User-Agent'));
  
  res.json({
    success: true,
    message: 'Two-factor authentication successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      twoFactorEnabled: true
    },
    tokens
  });
}));

// Email verification
router.post('/verify-email', [
  body('token').isLength({ min: 1 }).withMessage('Verification token is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { token } = req.body;
  
  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired verification token');
  }
  
  // Update user email verification status
  await query(
    'UPDATE users SET email_verified = TRUE WHERE id = $1',
    [decoded.id]
  );
  
  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// Password reset request
router.post('/forgot-password', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { email } = req.body;
  
  // Check if user exists
  const result = await query(
    'SELECT id, first_name FROM users WHERE email = $1',
    [email]
  );
  
  // Always return success to prevent email enumeration
  if (result.rows.length === 0) {
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }
  
  const user = result.rows[0];
  
  // Generate reset token
  const resetToken = jwt.sign(
    { id: user.id, email, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Send reset email
  try {
    await sendEmail({
      to: email,
      subject: 'Reset your RobustTicketing password',
      template: 'password-reset',
      data: {
        firstName: user.first_name,
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      }
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
  
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
}));

// Password reset
router.post('/reset-password', authLimiter, [
  body('token').isLength({ min: 1 }).withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be 8+ characters with uppercase, lowercase, number, and special character')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  const { token, password } = req.body;
  
  // Verify reset token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type');
    }
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }
  
  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // Update password
  await query(
    'UPDATE users SET password_hash = $1, login_attempts = 0, locked_until = NULL WHERE id = $2',
    [passwordHash, decoded.id]
  );
  
  securityLogger.logSecurityEvent('PASSWORD_RESET', {
    userId: decoded.id,
    email: decoded.email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

// Refresh token
router.post('/refresh', [
  body('refreshToken').isLength({ min: 1 }).withMessage('Refresh token is required')
], asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  
  // Get user
  const result = await query(
    'SELECT id, email, role FROM users WHERE id = $1',
    [decoded.id]
  );
  
  const user = result.rows[0];
  if (!user) {
    throw new UnauthorizedError('User not found');
  }
  
  // Generate new tokens
  const tokens = generateTokens(user);
  
  res.json({
    success: true,
    tokens
  });
}));

export default router;