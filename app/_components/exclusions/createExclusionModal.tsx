'use client';

import { useEffect, useState } from 'react';
import { Member } from '../types/member';

export interface ModalExclusion {
  memberAId: number;
  memberBId: number;
}

export interface CreateExclusionModalProps {
  open: boolean;
  onClose: () => void;
  familyId: number | string;
  members: Member[];
  /**
   * Existing exclusions as id pairs.
   * Host: all exclusions in the family.
   * Member: your own exclusions (any pair that includes you is enough).
   */
  exclusions: ModalExclusion[];
  /** Called after an exclusion is created so the parent can refetch. */
  onCreated: () => void | Promise<void>;
  /** Host picks any two people. Members pick one person to exclude from themselves. */
  isHost?: boolean;
  /** Required when isHost is false: the signed-in member's membership id. */
  currentMembershipId?: number;
}

export function CreateExclusionModal({
  open,
  onClose,
  familyId,
  members,
  exclusions,
  onCreated,
  isHost = false,
  currentMembershipId,
}: CreateExclusionModalProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const requiredCount = isHost ? 2 : 1;

  // Reset state every time the modal opens
  useEffect(() => {
    if (open) {
      setSelected([]);
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  // Host: members shown are everyone. Member: everyone except yourself.
  const visibleMembers = isHost
    ? members
    : members.filter((m) => m.id !== currentMembershipId);

  // The person whose existing exclusions restrict the other choices.
  // Host: the first person clicked. Member: always you.
  const anchorId = isHost ? selected[0] : currentMembershipId;

  const alreadyExcluded = new Set<number>();
  if (anchorId !== undefined) {
    for (const ex of exclusions) {
      if (ex.memberAId === anchorId) alreadyExcluded.add(ex.memberBId);
      if (ex.memberBId === anchorId) alreadyExcluded.add(ex.memberAId);
    }
  }

  function isDisabled(memberId: number) {
    // Selected people stay clickable so they can be deselected
    if (selected.includes(memberId)) return false;
    return alreadyExcluded.has(memberId);
  }

  function toggle(memberId: number) {
    if (submitting || isDisabled(memberId)) return;

    setError('');
    setSelected((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      // Member mode behaves like a radio group: picking someone replaces the previous pick
      if (!isHost) return [memberId];
      if (prev.length >= 2) return prev; // host: max two people
      return [...prev, memberId];
    });
  }

  async function handleSubmit() {
    if (selected.length !== requiredCount) return;

    if (!isHost && currentMembershipId === undefined) {
      setError('Something went wrong. Please refresh and try again.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = isHost
        ? await fetch(`/api/families/${familyId}/host/exclusions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetMembershipIdA: selected[0],
              targetMembershipIdB: selected[1],
            }),
          })
        : await fetch(`/api/families/${familyId}/exclusions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetMembershipId: selected[0] }),
          });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Failed to add exclusion');
        setSubmitting(false);
        return;
      }

      await onCreated();
      onClose();
    } catch {
      setError('An error occurred');
      setSubmitting(false);
    }
  }

  const selectedNames = selected
    .map((id) => members.find((m) => m.id === id)?.displayName)
    .filter(Boolean) as string[];

  const notEnoughMembers = visibleMembers.length < (isHost ? 2 : 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exclusions-modal-title"
        className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 id="exclusions-modal-title" className="text-xl font-bold">
              Add Exclusion
            </h3>
            <p className="text-sm text-gray-600">
              {isHost
                ? "Pick two people who shouldn't be matched with each other."
                : "Pick someone you don't want to be matched with. You'll both be emailed, and they'll see that you set it."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {notEnoughMembers ? (
          <p className="text-gray-600">
            {isHost
              ? 'Need at least two participants to add an exclusion.'
              : 'No one else has joined yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleMembers.map((member) => {
              const isSelected = selected.includes(member.id);
              const disabled = isDisabled(member.id);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggle(member.id)}
                  disabled={disabled || submitting}
                  aria-pressed={isSelected}
                  className={[
                    'p-3 rounded-lg border text-left text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-santa-red text-white border-santa-red'
                      : disabled
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-gray-300 hover:bg-red-50 hover:border-santa-red',
                  ].join(' ')}
                >
                  <span className="block">{member.displayName}</span>
                  {disabled && (
                    <span className="block text-xs font-normal">Already excluded</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selected.length === requiredCount && (
          <div className="bg-gray-50 p-3 rounded text-sm">
            {isHost
              ? `${selectedNames[0]} ↔ ${selectedNames[1]}`
              : `You ↔ ${selectedNames[0]}`}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.length !== requiredCount || submitting}
            className="text-white bg-santa-red px-4 py-2 rounded font-medium hover:bg-red-500 disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Exclusion'}
          </button>
        </div>
      </div>
    </div>
  );
}
