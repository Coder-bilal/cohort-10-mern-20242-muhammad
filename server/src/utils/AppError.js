'use strict';

/**
 * Custom Application Operational Error.
 */
class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Optional application error code
   */
  constructor(message, statusCode, code) {
    super(message);
    /** @type {number} */
    this.statusCode = statusCode;
    /** @type {string} */
    this.code = code || 'ERROR';
    /** @type {boolean} */
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
