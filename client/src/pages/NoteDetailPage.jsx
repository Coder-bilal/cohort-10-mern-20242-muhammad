import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pin, Star, Download, Trash2, Save } from 'lucide-react';
import NoteEditor from '../components/notes/NoteEditor';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import * as notesService from '../services/notesService';
import { formatDate } from '../utils/helpers';

const NoteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadNote = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await notesService.getNoteById(id);
        const note = response?.data?.data?.note;
        if (note) {
          setTitle(note.title);
          setContent(note.content);
          setCategory(note.category || '');
          setTags(note.tags || '');
          setIsPinned(Boolean(note.is_pinned));
          setIsFavorite(Boolean(note.is_favorite));
          setUpdatedAt(note.updated_at || note.created_at);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load note');
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        title: title.trim(),
        content,
        is_pinned: isPinned ? 1 : 0,
      };
      if (category.trim()) payload.category = category.trim();
      if (tags.trim()) payload.tags = tags.trim();
      if (isFavorite) payload.is_favorite = 1;

      const response = await notesService.updateNote(id, payload);
      const updated = response?.data?.data?.note;
      if (updated) {
        setUpdatedAt(updated.updated_at);
      }
      setSuccessMsg('Note saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await notesService.exportNote(id, format);
      if (typeof window !== 'undefined' && window.URL?.createObjectURL) {
        const blob = new Blob([response.data], {
          type: format === 'pdf' ? 'application/pdf' : 'text/plain;charset=utf-8',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTitle = (title || `note-${id}`)
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase() || `note-${id}`;
        link.download = `${safeTitle}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to export note');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await notesService.deleteNote(id);
      setConfirmDeleteOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete note');
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted hover:text-primary hover:bg-surface border border-transparent hover:border-subtle rounded-lg transition-colors duration-150"
            title="Back to dashboard"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>Back</span>
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-primary line-clamp-1">
              Edit Note
            </h1>
            {updatedAt && (
              <p className="text-xs text-muted">
                Last modified: {formatDate(updatedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExport('txt')}
          >
            <Download size={15} strokeWidth={1.75} />
            <span>Export TXT</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            <Download size={15} strokeWidth={1.75} />
            <span>Export PDF</span>
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={deleting}
          >
            <Trash2 size={15} strokeWidth={1.75} />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={15} strokeWidth={1.75} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-soft border border-danger/20 text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-accent-soft border border-accent/20 text-accent rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {/* Editor Form */}
      <form onSubmit={handleSave} className="space-y-6 bg-surface p-6 rounded-xl border border-subtle shadow-card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              required
            />
          </div>

          <div className="flex items-center gap-4 mb-2 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-pin"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 accent-accent rounded border-subtle focus:ring-accent"
              />
              <label htmlFor="edit-pin" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary cursor-pointer">
                <Pin size={14} strokeWidth={1.75} className="text-muted" />
                <span>Pinned to top</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-favorite"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="h-4 w-4 accent-accent rounded border-subtle focus:ring-accent"
              />
              <label htmlFor="edit-favorite" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary cursor-pointer">
                <Star size={14} strokeWidth={1.75} className="text-muted" />
                <span>Favorite</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Work, Personal"
          />
          <Input
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. urgent, meeting"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-primary mb-1.5">
            Note Content
          </span>
          <NoteEditor
            content={content}
            onChange={(html) => setContent(html)}
          />
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={deleting}
      />
    </div>
  );
};

export default NoteDetailPage;
