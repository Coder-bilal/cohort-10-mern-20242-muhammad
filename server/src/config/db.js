'use strict';

const mysql = require('mysql2/promise');
const logger = require('./logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database:
    process.env.NODE_ENV === 'test'
      ? process.env.DB_TEST_NAME || 'notes_app_test'
      : process.env.DB_NAME || 'notes_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Execute a SQL query using pool.execute (auto-prepared statement).
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>} [rows, fields]
 */
async function query(sql, params) {
  try {
    const [rows, fields] = await pool.execute(sql, params);
    return [rows, fields];
  } catch (err) {
    logger.error({ err: { message: err.message, code: err.code }, sql }, 'Database query failed');
    throw err;
  }
}

/**
 * Test MySQL database connectivity.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    logger.info('Database connection established successfully');
    return { success: true, message: 'Database connection established successfully' };
  } catch (err) {
    logger.error({ err: { message: err.message, code: err.code } }, 'Database connection failed');
    return { success: false, message: err.message, code: err.code };
  }
}

/**
 * Execute multiple queries within a single database transaction.
 * @param {Function} callback (connection) => Promise<T>
 * @returns {Promise<T>}
 */
async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    logger.error({ err: { message: error.message, code: error.code } }, 'Database transaction rolled back');
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, testConnection, transaction };
