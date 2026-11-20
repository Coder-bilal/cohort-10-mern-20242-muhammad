'use strict';

const AppError = require('../utils/AppError');
const authService = require('../services/authService');

/**
 * Protect routes by verifying the JWT cookie.
 */
async function protect(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return next(new AppError('Authentication required', 401, 'MISSING_TOKEN'));
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
  }
}

module.exports = { protect };
