'use strict';

const { query } = require('../config/db');

let columnsEnsured = false;

/**
 * Automatically add optional columns (category, tags, is_favorite) if missing on an existing table.
 */
async function ensureOptionalColumns() {
  if (columnsEnsured) return;
  const statements = [
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'General'",
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags VARCHAR(255) NOT NULL DEFAULT ''",
    'ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_favorite TINYINT(1) NOT NULL DEFAULT 0',
  ];
  for (const sql of statements) {
    try {
      await query(sql, []);
    } catch {
      // Ignore if column already exists or running in mocked environment
    }
  }
  columnsEnsured = true;
}

/**
 * Execute query with automatic one-time column migration fallback if ER_BAD_FIELD_ERROR occurs.
 */
async function runWithSchemaFallback(sql, params) {
  try {
    return await query(sql, params);
  } catch (err) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR' && !columnsEnsured) {
      await ensureOptionalColumns();
      return query(sql, params);
    }
    throw err;
  }
}

/**
 * Strip HTML tags to produce plain text
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const SELECT_COLUMNS =
  'id, user_id, title, content, content_text, category, tags, is_pinned, is_favorite, created_at, updated_at';

/**
 * Create a new note and return the full note row.
 */
async function create({
  user_id,
  title,
  content,
  content_text,
  category = 'General',
  tags = '',
  is_pinned = 0,
  is_favorite = 0,
}) {
  const plainText = content_text !== undefined ? content_text : stripHtml(content);
  const [result] = await runWithSchemaFallback(
    'INSERT INTO notes (user_id, title, content, content_text, category, tags, is_pinned, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [user_id, title, content, plainText, category || 'General', tags || '', is_pinned || 0, is_favorite || 0]
  );
  const [rows] = await runWithSchemaFallback(
    `SELECT ${SELECT_COLUMNS} FROM notes WHERE id = ? LIMIT 1`,
    [result.insertId]
  );
  return rows[0];
}

/**
 * Find all notes for a user with optional filtering and sorting.
 * @param {number} userId
 * @param {{ search?: string, pinned?: string, favorite?: string, category?: string, tag?: string, sort?: string }} options
 * @returns {Promise<Array>}
 */
async function findAllByUser(userId, { search, pinned, favorite, category, tag, sort } = {}) {
  let sql = `SELECT ${SELECT_COLUMNS} FROM notes WHERE user_id = ?`;
  const params = [userId];

  if (search?.trim()) {
    sql += ' AND (title LIKE ? OR content_text LIKE ?)';
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern);
  }

  if (pinned === 'true') {
    sql += ' AND is_pinned = 1';
  }

  if (favorite === 'true') {
    sql += ' AND is_favorite = 1';
  }

  if (category?.trim()) {
    sql += ' AND category = ?';
    params.push(category.trim());
  }

  if (tag?.trim()) {
    sql += ' AND tags LIKE ?';
    params.push(`%${tag.trim()}%`);
  }

  if (sort === 'oldest' || sort === 'updated_asc') {
    sql += ' ORDER BY is_pinned DESC, updated_at ASC';
  } else if (sort === 'created_desc') {
    sql += ' ORDER BY is_pinned DESC, created_at DESC';
  } else if (sort === 'created_asc') {
    sql += ' ORDER BY is_pinned DESC, created_at ASC';
  } else if (sort === 'title') {
    sql += ' ORDER BY is_pinned DESC, title ASC';
  } else {
    sql += ' ORDER BY is_pinned DESC, updated_at DESC';
  }

  const [rows] = await runWithSchemaFallback(sql, params);
  return rows;
}

/**
 * Find a single note by id and userId.
 */
async function findById(id, userId) {
  const [rows] = await runWithSchemaFallback(
    `SELECT ${SELECT_COLUMNS} FROM notes WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0] || null;
}

/**
 * Update a note dynamically by provided fields.
 */
async function update(id, userId, fields) {
  const allowedFields = [
    'title',
    'content',
    'content_text',
    'category',
    'tags',
    'is_pinned',
    'is_favorite',
  ];
  const setClauses = [];
  const params = [];

  const updatedFields = { ...fields };
  if (updatedFields.content !== undefined && updatedFields.content_text === undefined) {
    updatedFields.content_text = stripHtml(updatedFields.content);
  }

  for (const field of allowedFields) {
    if (updatedFields[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      params.push(updatedFields[field]);
    }
  }

  setClauses.push('updated_at = NOW()');
  params.push(id, userId);

  await runWithSchemaFallback(
    `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );

  const [rows] = await runWithSchemaFallback(
    `SELECT ${SELECT_COLUMNS} FROM notes WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0];
}

/**
 * Delete a note by id and userId.
 */
async function deleteById(id, userId) {
  await runWithSchemaFallback('DELETE FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
}

module.exports = {
  create,
  findAllByUser,
  findById,
  update,
  deleteById,
  stripHtml,
};
