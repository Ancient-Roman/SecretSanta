'use client';

import { useEffect, useState } from 'react';

export interface WishlistItem {
  id: number;
  title: string;
  url?: string;
  notes?: string;
}

interface WishlistItemModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  item?: WishlistItem | null;
  familyId: string | number;
  onClose: () => void;
  onSaved: (item: WishlistItem, mode: 'add' | 'edit') => void;
}

export function WishlistItemModal({
  open,
  mode,
  item,
  familyId,
  onClose,
  onSaved,
}: WishlistItemModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setTitle(item?.title || '');
    setUrl(item?.url || '');
    setNotes(item?.notes || '');
    
    setError('');
    setSubmitting(false);
  }, [open, mode, item]);

  // for accessibility, close on Escape key
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    if (mode === 'edit' && !item) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/families/${familyId}/wishlist`, {
        method: mode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'add'
            ? { title: title.trim(), url, notes }
            : { id: item!.id, title: title.trim(), url, notes }
        ),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || `Failed to ${mode === 'add' ? 'add' : 'update'} item`);
        setSubmitting(false);
        return;
      }

      const data = await response.json();
      onSaved(data.item, mode);
      onClose();
    } catch {
      setError('An error occurred');
      setSubmitting(false);
    }
  }

  function isFormUpdated() {
    if (mode === 'add') return title.trim().length > 0;
    return !!item && (
      title.trim() !== item.title ||
      url.trim() !== (item.url || '') ||
      notes.trim() !== (item.notes || '')
    );
  }

  const isSaveDisabled = submitting || !title.trim() || !isFormUpdated();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-wishlist-item-title"
        className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h3 id="edit-wishlist-item-title" className="text-xl font-bold">
            {mode === 'edit' ? 'Edit' : 'Add'} Wishlist Item
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-wishlist-title" className="block text-sm font-medium mb-1">
              Title *
            </label>
            <input
              id="edit-wishlist-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              maxLength={255}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="edit-wishlist-url" className="block text-sm font-medium mb-1">
              URL (optional)
            </label>
            <input
              id="edit-wishlist-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded border border-gray-300 px-3 py-2"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="edit-wishlist-notes" className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              id="edit-wishlist-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              maxLength={1000}
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              className="flex-1 rounded bg-santa-red px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
            >
              {submitting
                ? mode === 'add' ? 'Adding...' : 'Saving...'
                : mode === 'add' ? 'Add Item' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
