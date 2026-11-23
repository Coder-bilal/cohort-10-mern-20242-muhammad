'use strict';

const userModel = require('../models/userModel');
const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/** Cookie options for the JWT token */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, username, email, password } = req.body;
    let finalUsername = username;
    if (!finalUsername) {
      const derived = (name ? name.toLowerCase().replace(/\s+/g, '_') : email.split('@')[0])
        .replace(/[^\w]/g, '');
      finalUsername = derived;
    }

    if (
      !finalUsername ||
      finalUsername.length < 3 ||
      finalUsername.length > 50 ||
      !/^\w+$/.test(finalUsername)
    ) {
      return next(
        new AppError(
          'Username must be between 3 and 50 alphanumeric characters or underscores',
          400,
          'VALIDATION_ERROR'
        )
      );
    }

    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      logger.warn({ event: 'auth.register.duplicate_email', email }, 'Registration rejected: email already in use');
      return next(new AppError('Email already in use', 409, 'DUPLICATE_ENTRY'));
    }

    const existingUsername = await userModel.findByUsername(finalUsername);
    if (existingUsername) {
      logger.warn({ event: 'auth.register.duplicate_username', username: finalUsername }, 'Registration rejected: username already taken');
      return next(new AppError('Username already taken', 409, 'DUPLICATE_ENTRY'));
    }

    const password_hash = await authService.hashPassword(password);
    const user = await userModel.create({ name, username: finalUsername, email, password_hash });

    logger.info({ event: 'auth.register.success', userId: user.id, email: user.email }, 'User registered successfully');

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: { id: user.id, name: user.name, username: user.username, email: user.email },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await userModel.findByEmail(email);
    if (!user) {
      logger.warn({ event: 'auth.login.failed', email }, 'Login failed: user not found');
      return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    }

    const isValid = await authService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      logger.warn({ event: 'auth.login.failed', userId: user.id, email }, 'Login failed: invalid password');
      return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    }

    const token = authService.signToken({ userId: user.id, email: user.email });

    res.cookie('token', token, cookieOptions);
    logger.info({ event: 'auth.login.success', userId: user.id, email: user.email }, 'User logged in successfully');

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, name: user.name, username: user.username, email: user.email },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    res.clearCookie('token', cookieOptions);
    logger.info({ event: 'auth.logout', userId: req.user?.userId || null }, 'User logged out');
    return res.json({ success: true, message: 'Logged out successfully', data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }
    logger.debug({ event: 'auth.me', userId: user.id }, 'Current user retrieved');
    return res.json({ success: true, message: 'User retrieved successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, getMe };
