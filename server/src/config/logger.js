'use strict';

const pino = require('pino');

const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    'req.body.password',
    'req.body.password_hash',
    'req.body.currentPassword',
    'req.body.newPassword',
    'body.password',
    'body.password_hash',
    'body.currentPassword',
    'body.newPassword',
    'password',
    'password_hash',
    'currentPassword',
    'newPassword',
    'token',
    'jwt',
    'req.cookies.token',
  ],
  censor: '[Redacted]',
};

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

/** @type {import('pino').Logger} */
let logger;

if (process.env.NODE_ENV === 'production') {
  logger = pino({ level, redact });
} else {
  logger = pino({
    level,
    redact,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
}

module.exports = logger;
