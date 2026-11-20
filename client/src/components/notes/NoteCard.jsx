import React from 'react';
import PropTypes from 'prop-types';
import { Pin, Star, Trash2 } from 'lucide-react';
import { formatDate, truncateText } from '../../utils/helpers';

const NoteCard = ({ note, onDelete, onPin, onFavorite, onClick }) => {
  const isPinned = Boolean(note.is_pinned);
  const isFavorite = Boolean(note.is_favorite);
  const tagList = note.tags
    ? String(note.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div // NOSONAR
      role="button" // NOSONAR
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      className={`group relative flex flex-col justify-between p-5 rounded-xl border bg-surface shadow-card hover:border-accent hover:-translate-y-0.5 transition-all duration-150 cursor-pointer ${
        isPinned ? 'border-accent/50' : 'border-subtle'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-display text-base font-semibold text-primary group-hover:text-accent transition-colors duration-150 line-clamp-1">
            {note.title}
          </h4>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.(note.id, isFavorite);
              }}
              className={`p-1.5 rounded-lg transition-colors duration-150 ${
                isFavorite
                  ? 'text-accent bg-accent-soft'
                  : 'text-muted opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-primary hover:bg-canvas'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={isFavorite ? 'Unfavorite note' : 'Favorite note'}
            >
              <Star
                size={16}
                strokeWidth={1.75}
                className={isFavorite ? 'fill-current' : ''}
              />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPin?.(note.id, isPinned);
              }}
              className={`p-1.5 rounded-lg transition-colors duration-150 ${
                isPinned
                  ? 'text-accent bg-accent-soft'
                  : 'text-muted opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-primary hover:bg-canvas'
              }`}
              title={isPinned ? 'Unpin note' : 'Pin note to top'}
              aria-label={isPinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {(note.category || tagList.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {note.category && (
              <span className="px-2 py-0.5 text-xs font-medium bg-accent-soft text-accent rounded-md">
                {note.category}
              </span>
            )}
            {tagList.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-canvas text-muted border border-subtle rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm text-muted line-clamp-3 mb-4 leading-relaxed">
          {truncateText(note.content, 120)}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-subtle text-xs text-muted">
        <span>{formatDate(note.updated_at || note.created_at)}</span>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(note.id);
            }}
            className="p-1.5 text-muted opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger hover:bg-danger-soft rounded-md transition-all duration-150"
            title="Delete note"
            aria-label="Delete note"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};

NoteCard.propTypes = {
  note: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    content: PropTypes.string,
    category: PropTypes.string,
    tags: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    is_pinned: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    is_favorite: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
  }),
  onDelete: PropTypes.func,
  onPin: PropTypes.func,
  onFavorite: PropTypes.func,
  onClick: PropTypes.func,
};

export default NoteCard;
