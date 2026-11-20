'use strict';

const EventEmitter = require('events');
const logger = require('../config/logger');

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

let ioInstance = null;

/**
 * Get the room name for a specific user ID.
 * @param {number|string} userId
 * @returns {string}
 */
function getUserRoom(userId) {
  return `user:${userId}`;
}

/**
 * Attach a Socket.IO server instance (or mock in tests).
 * @param {object} io
 */
function setIoInstance(io) {
  ioInstance = io;
  if (io && typeof io.on === 'function') {
    io.on('connection', (socket) => {
      const userId = socket.handshake?.auth?.userId || socket.handshake?.query?.userId;
      if (userId) {
        socket.join(getUserRoom(userId));
        logger.debug({ event: 'socket.connected', userId }, 'Socket.IO client joined user room');
      }
    });
  }
}

/**
 * Emit a real-time note event scoped strictly to the owning user.
 * @param {number|string} userId
 * @param {'note:created'|'note:updated'|'note:deleted'} eventName
 * @param {object} payload
 */
function emitNoteEvent(userId, eventName, payload) {
  if (!userId) return;
  const room = getUserRoom(userId);
  const eventData = {
    event: eventName,
    userId: Number(userId),
    timestamp: new Date().toISOString(),
    data: payload,
  };

  emitter.emit(room, eventData);

  if (ioInstance && typeof ioInstance.to === 'function') {
    ioInstance.to(room).emit(eventName, eventData);
  }
}

/**
 * Subscribe a listener to a user's real-time note events.
 * @param {number|string} userId
 * @param {Function} listener
 * @returns {Function} Unsubscribe function
 */
function subscribeUser(userId, listener) {
  const room = getUserRoom(userId);
  emitter.on(room, listener);
  return () => emitter.off(room, listener);
}

module.exports = {
  getUserRoom,
  setIoInstance,
  emitNoteEvent,
  subscribeUser,
};
