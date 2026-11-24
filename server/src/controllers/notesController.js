'use strict';

const notesService = require('../services/notesService');

async function createNote(req, res, next) {
  try {
    const { title, content, category, tags, is_pinned, is_favorite } = req.body;
    const note = await notesService.createNote(req.user.userId, {
      title,
      content,
      category,
      tags,
      is_pinned,
      is_favorite,
    });
    return res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note },
    });
  } catch (err) {
    next(err);
  }
}

async function getAllNotes(req, res, next) {
  try {
    const { page, limit, search, favorite, pinned, category, tag, sort } = req.query;

    // Validate query parameters to reject arrays/objects from repeated or bracketed keys
    const scalarFilters = { search, category, tag, sort, favorite, pinned };
    for (const [key, value] of Object.entries(scalarFilters)) {
      if (value !== undefined && typeof value !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Query parameter "${key}" must be a string`,
          code: 'VALIDATION_ERROR',
        });
      }
    }

    if (page !== undefined && typeof page !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "page" must be a string or number',
        code: 'VALIDATION_ERROR',
      });
    }

    if (limit !== undefined && typeof limit !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "limit" must be a string or number',
        code: 'VALIDATION_ERROR',
      });
    }

    // Build filters object — only include keys that were actually provided
    const filters = {};
    if (search !== undefined) filters.search = search;
    if (favorite !== undefined) filters.favorite = favorite;
    if (pinned !== undefined) filters.pinned = pinned;
    if (category !== undefined) filters.category = category;
    if (tag !== undefined) filters.tag = tag;
    if (sort !== undefined) filters.sort = sort;

    const allNotes = await notesService.getNotesByUser(req.user.userId, filters);
    const { items: notes, pagination } = notesService.paginateNotes(allNotes, page, limit);

    return res.json({
      success: true,
      message: 'Notes retrieved successfully',
      data: { notes, pagination },
    });
  } catch (err) {
    next(err);
  }
}

async function getNoteById(req, res, next) {
  try {
    const note = await notesService.getNoteById(req.params.id, req.user.userId);
    return res.json({
      success: true,
      message: 'Note retrieved successfully',
      data: { note },
    });
  } catch (err) {
    next(err);
  }
}

async function updateNote(req, res, next) {
  try {
    const { title, content, category, tags, is_pinned, is_favorite } = req.body;
    const note = await notesService.updateNote(req.params.id, req.user.userId, {
      title,
      content,
      category,
      tags,
      is_pinned,
      is_favorite,
    });
    return res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteNote(req, res, next) {
  try {
    await notesService.deleteNote(req.params.id, req.user.userId);
    return res.json({
      success: true,
      message: 'Note deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
};
