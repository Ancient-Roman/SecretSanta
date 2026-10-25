'use client';

import { useEffect, useState } from 'react';
import { Exclusion } from '../types/exclusion';

interface DeleteExclusionModalProps {
  /** The exclusion being deleted. Pass null to keep the modal closed. */
  exclusion: Exclusion | null;
  onClose: () => void;
  familyId: number | string;
  /** Called after a successful delete so the parent can refetch. */
  onDeleted: () => void | Promise<void>;
}

export function DeleteExclusionModal({
  exclusion,
  onClose,
  familyId,
  onDeleted,
}: DeleteExclusionModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Reset state whenever a different exclusion is opened
  useEffect(() => {
    setDeleting(false);
    setError('');
  }, [exclusion]);

  // Close on Escape
  useEffect(() => {
    if (!exclusion) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exclusion, deleting, onClose]);

  if (!exclusion) return null;

  async function handleDelete() {
    if (!exclusion) return;

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(
        `/api/families/${familyId}/host/exclusions`, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetMembershipIdA: String(exclusion.memberAId),
            targetMembershipIdB: String(exclusion.memberBId),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Failed to remove exclusion');
        setDeleting(false);
        return;
      }

      await onDeleted();
      onClose();
    } catch {
      setError('An error occurred');
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !deleting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-exclusion-title"
        className="bg-white rounded-lg p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-exclusion-title" className="text-xl font-bold">
          Remove Exclusion?
        </h3>

        <p className="text-sm text-gray-600">
          {exclusion.memberA} and {exclusion.memberB} will be able to draw each
          other again. Both of them will be emailed that you removed it.
        </p>

        <div className="bg-gray-50 p-3 rounded text-sm font-medium">
          {exclusion.memberA} ↔ {exclusion.memberB}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-white bg-santa-red px-4 py-2 rounded font-medium hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? 'Removing...' : 'Remove Exclusion'}
          </button>
        </div>
      </div>
    </div>
  );
}