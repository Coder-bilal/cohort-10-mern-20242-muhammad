'use strict';

require('dotenv').config();

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  throw new Error('JWT_SECRET must be set and non-empty');
}

const logger = require('./src/config/logger');

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception — shutting down');
  process.exit(1);
});

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  /** @type {ReturnType<typeof setTimeout>} */
  const timer = setTimeout(() => process.exit(0), 5000);
  timer.unref();
  server.close(() => {
    clearTimeout(timer);
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ err: reason, promise }, 'Unhandled Rejection — shutting down');
  /** @type {ReturnType<typeof setTimeout>} */
  const timer = setTimeout(() => process.exit(1), 5000);
  timer.unref();
  server.close(() => {
    clearTimeout(timer);
    process.exit(1);
  });
});
