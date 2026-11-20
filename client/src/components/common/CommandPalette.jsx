import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, User, SunMedium, FileText, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const CommandPalette = ({ isOpen, onClose, notes = [], onNewNote }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions = [
      {
        id: 'action-new',
        label: 'New note',
        type: 'Action',
        icon: Plus,
        onSelect: () => {
          onClose();
          if (onNewNote) onNewNote();
          else navigate('/dashboard');
        },
      },
      {
        id: 'action-profile',
        label: 'Go to Profile Settings',
        type: 'Navigation',
        icon: User,
        onSelect: () => {
          onClose();
          navigate('/profile');
        },
      },
      {
        id: 'action-theme',
        label: 'Toggle color theme',
        type: 'Appearance',
        icon: SunMedium,
        onSelect: () => {
          toggleTheme();
          onClose();
        },
      },
    ].filter((a) => !q || a.label.toLowerCase().includes(q));

    const matchingNotes = notes
      .filter(
        (n) =>
          !q ||
          n.title?.toLowerCase().includes(q) ||
          n.content_text?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((n) => ({
        id: `note-${n.id}`,
        label: n.title,
        type: 'Note',
        icon: FileText,
        onSelect: () => {
          onClose();
          navigate(`/notes/${n.id}`);
        },
      }));

    return [...actions, ...matchingNotes];
  }, [query, notes, navigate, onClose, onNewNote, toggleTheme]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[activeIndex]) {
      e.preventDefault();
      items[activeIndex].onSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-canvas/80 backdrop-blur-sm m-0 w-full h-full max-w-none max-h-none border-0 p-0"
      aria-label="Command palette"
    >
      <div className="w-full max-w-lg rounded-xl border border-subtle bg-surface text-primary shadow-elevated overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle">
          <Search size={18} strokeWidth={1.75} className="text-muted shrink-0" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search notes..."
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded-md text-muted hover:text-primary"
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">No matching commands or notes</p>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-accent-soft text-accent'
                      : 'text-primary hover:bg-canvas'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span className="truncate font-medium">{item.label}</span>
                  </span>
                  <span className="text-[11px] font-mono text-muted ml-2 shrink-0">
                    {item.type}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </dialog>
  );
};

CommandPalette.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  notes: PropTypes.arrayOf(PropTypes.object),
  onNewNote: PropTypes.func,
};

export default CommandPalette;
