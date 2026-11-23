'use strict';

const userModel = require('../models/userModel');
const authService = require('../services/authService');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Verify currentPassword against stored password_hash.
 */
async function assertCurrentPassword(currentPassword, passwordHash) {
  if (!currentPassword) {
    throw new AppError(
      'Current password is required to change email or password',
      400,
      'PASSWORD_REQUIRED'
    );
  }
  const isValid = await authService.verifyPassword(currentPassword, passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }
}

/**
 * Hash and save a new password after ensuring it differs from currentPassword.
 */
async function applyNewPassword(userId, currentPassword, newPassword) {
  if (currentPassword === newPassword) {
    throw new AppError(
      'New password must be different from current password',
      400,
      'SAME_PASSWORD'
    );
  }
  const newHash = await authService.hashPassword(newPassword);
  await userModel.updatePassword(userId, newHash);
}

/**
 * Ensure new email is not already taken by another user.
 */
async function assertEmailAvailable(email, userId) {
  const existingEmailUser = await userModel.findByEmail(email);
  if (existingEmailUser && existingEmailUser.id !== userId) {
    throw new AppError('Email already in use', 409, 'DUPLICATE_ENTRY');
  }
}

/**
 * Ensure new username is not already taken by another user.
 */
async function assertUsernameAvailable(username, userId) {
  const existingNameUser = await userModel.findByUsername(username);
  if (existingNameUser && existingNameUser.id !== userId) {
    throw new AppError('Username already taken', 409, 'DUPLICATE_ENTRY');
  }
}

/**
 * GET /api/users/profile
 */
async function getProfile(req, res, next) {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }
    logger.debug({ event: 'user.profile.get', userId: req.user.userId }, 'User profile retrieved');
    return res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/profile
 */
async function updateProfile(req, res, next) {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Load credential record by userId, not token's email
    const user = await userModel.findByIdWithPassword(userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const isEmailChanging = Boolean(email && email.toLowerCase() !== user.email.toLowerCase());
    const isPasswordChanging = Boolean(newPassword);

    if (isEmailChanging || isPasswordChanging) {
      await assertCurrentPassword(currentPassword, user.password_hash);
    }

    if (isPasswordChanging && currentPassword === newPassword) {
      return next(
        new AppError(
          'New password must be different from current password',
          400,
          'SAME_PASSWORD'
        )
      );
    }

    if (isEmailChanging) {
      await assertEmailAvailable(email, userId);
    }

    if (username && username !== user.username) {
      await assertUsernameAvailable(username, userId);
    }

    let newHash = null;
    if (isPasswordChanging) {
      newHash = await authService.hashPassword(newPassword);
    }

    // Atomically execute profile update and password update within transaction
    await db.transaction(async (conn) => {
      await userModel.updateProfile(
        userId,
        {
          username: username || user.username,
          email: isEmailChanging ? email : user.email,
        },
        conn
      );

      if (isPasswordChanging && newHash) {
        await userModel.updatePassword(userId, newHash, conn);
      }
    });

    const updatedUser = await userModel.findById(userId);
    logger.info({ event: 'user.profile.updated', userId }, 'User profile updated successfully');
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Load credential record by userId, not token's email
    const user = await userModel.findByIdWithPassword(userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    await assertCurrentPassword(currentPassword, user.password_hash);
    await applyNewPassword(userId, currentPassword, newPassword);

    logger.info({ event: 'user.password.changed', userId }, 'User password changed successfully');

    return res.json({
      success: true,
      message: 'Password changed successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, changePassword };
