'use strict';

const { body, validationResult } = require('express-validator');

const usernameRule = () =>
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^\w+$/)
    .withMessage('Username may only contain letters, numbers, and underscores');

const emailRule = () =>
  body('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address');

// --- Validation rule arrays ---

const registerValidation = [
  usernameRule(),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  emailRule(),
  body('password')
    .isString()
    .bail()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('Password must not exceed 72 bytes'),
];

const loginValidation = [
  emailRule(),
  body('password')
    .isString()
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
];

const noteValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('content').notEmpty().withMessage('Content is required'),
];

const updateNoteValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('content').optional(),
];

const profileValidation = [
  usernameRule(),
  body('email')
    .optional()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('currentPassword')
    .optional()
    .isString()
    .bail()
    .notEmpty()
    .withMessage('Current password cannot be empty'),
  body('newPassword')
    .optional()
    .isString()
    .bail()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('New password must not exceed 72 bytes'),
];

const changePasswordValidation = [
  body('currentPassword')
    .isString()
    .bail()
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .bail()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('New password must not exceed 72 bytes'),
];

// --- validate middleware ---

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, code: 'VALIDATION_ERROR' });
  }
  next();
}

module.exports = {
  registerValidation,
  loginValidation,
  noteValidation,
  updateNoteValidation,
  profileValidation,
  changePasswordValidation,
  validate,
};
