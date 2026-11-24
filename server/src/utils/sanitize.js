'use strict';

const sanitizeHtml = require('sanitize-html');

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const HTML_ENTITY_REGEX = /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g;

/**
 * Decodes HTML entities in a single pass to prevent double-decoding vulnerabilities.
 * @param {string} str
 * @returns {string}
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str.replace(HTML_ENTITY_REGEX, (match) => HTML_ENTITY_MAP[match] || match);
}

/**
 * Strips all HTML tags and attributes, returning pure plain text.
 * Used for title sanitization and indexing.
 * @param {string} text
 * @returns {string}
 */
function sanitizePlainText(text) {
  if (!text) return '';
  // Strip all HTML tags using sanitize-html
  const stripped = sanitizeHtml(String(text), {
    allowedTags: [],
    allowedAttributes: {},
  });
  // sanitize-html encodes entities when stripping tags (e.g. R&D → R&amp;D).
  // Decode them in a single pass so stored plain text contains literal characters,
  // without decoding characters produced by previous replacements.
  return decodeHtmlEntities(stripped).trim();
}

/**
 * Sanitizes rich text HTML content, allowing only safe typography,
 * formatting, and semantic tags.
 * Explicitly strips script tags, iframe, onerror, onclick, and javascript: links.
 * @param {string} html
 * @returns {string}
 */
function sanitizeRichContent(html) {
  if (!html) return '';
  return sanitizeHtml(String(html), {
    allowedTags: [
      'h1', 'h2', 'h3',
      'p', 'br',
      'strong', 'em', 'u', 's',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
  });
}

module.exports = {
  sanitizePlainText,
  sanitizeRichContent,
  decodeHtmlEntities,
};
