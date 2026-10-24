'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface HostFamily {
  id: number;
  name: string;
  status: string;
  members: Array<{ id: number; name: string }>;
  exclusions: Array<{
    memberAId: number;
    memberBId: number;
    memberA: string;
    memberB: string;
  }>;
  failedEmails: Array<{ giver: string; receiver: string; error: string }>;
}

export default function HostControlsPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId;

  const [family, setFamily] = useState<HostFamily | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [showExclusionModal, setShowExclusionModal] = useState(false);
  const [exclusionToDelete, setExclusionToDelete] = useState<ExclusionToDelete | null>(null);

  useEffect(() => {
    fetchFamily();
  }, [familyId]);

  async function fetchFamily() {
    try {
      const response = await fetch(`/api/families/${familyId}/host`);
      if (!response.ok) throw new Error('Failed to fetch family');
      const data = await response.json();
      setFamily(data);
    } catch (err) {
      setError('Failed to load controls');
    } finally {
      setLoading(false);
    }
  }

  async function handleDrawNames() {
    if (!window.confirm('Draw Secret Santa names? This locks the family.')) return;

    setDrawing(true);
    setError('');

    try {
      const response = await fetch(`/api/families/${familyId}/draw`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to draw names');
        setDrawing(false);
        return;
      }

      // Refresh and redirect
      await fetchFamily();
      router.push(`/f/${familyId}`);
    } catch (err) {
      setError('An error occurred');
      setDrawing(false);
    }
  }

  async function handleStartDayOf() {
    if (!window.confirm('Start day-of mode? Names will be revealable.')) return;

    try {
      const response = await fetch(`/api/families/${familyId}/day-of`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to start day-of');

      router.push(`/f/${familyId}/day-of`);
    } catch (err) {
      setError('Failed to start day-of mode');
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!family) return <div>Family not found</div>;

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{family.name} - Host Controls</h2>
        <a href={`/f/${familyId}`} className="text-gray-600 hover:text-gray-900">
          ← Back
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium">Status: <span className="text-blue-800">{capitalize(family.status)}</span></p>
      </div>

      {family.status === 'open' && (
        <div className="bg-santa-red text-white rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold">Ready to Draw Names?</h3>
          <p className="text-sm opacity-90">{family.members.length} participants</p>
          <button
            onClick={handleDrawNames}
            disabled={drawing || family.members.length < 3}
            className="bg-white text-santa-red px-4 py-2 rounded font-medium hover:bg-red-50 disabled:opacity-50"
          >
            {drawing ? 'Drawing...' : 'Draw Secret Santa Names'}
          </button>
        </div>
      )}

      {family.status === 'locked' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold">Start Day-Of Reveal</h3>
          <button
            onClick={handleStartDayOf}
            className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700"
          >
            Go to Reveal Page
          </button>
        </div>
      )}

      {family.status === 'day_of' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">Day-of mode active</p>
          <a href={`/f/${familyId}/day-of`} className="text-yellow-700 hover:underline">
            Go to reveal page →
          </a>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Exclusions ({family.exclusions.length})</h3>
        {family.exclusions.length === 0 ? (
          <p className="text-gray-600">No exclusions</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {family.exclusions.map((ex) => (
              <div
                key={`${ex.memberAId}-${ex.memberBId}`}
                className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-2 py-2 text-sm"
              >
                <span>
                  {ex.memberA} ↔ {ex.memberB}
                </span>
                {family.status === 'open' && (
                  <button
                    onClick={() => setExclusionToDelete(ex)}
                    aria-label={`Remove exclusion between ${ex.memberA} and ${ex.memberB}`}
                    className="text-gray-400 hover:text-santa-red px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {family.status === 'open' && (
          <button
            onClick={() => setShowExclusionModal(true)}
            className="text-white bg-santa-red px-4 py-2 rounded font-medium hover:bg-red-500"
          >
            {'Add Exclusions'}
          </button>
        )}
      </div>

      {family.failedEmails.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
          <h3 className="font-bold text-red-800">Failed Email Sends</h3>
          {family.failedEmails.map((fe, i) => (
            <div key={i} className="text-sm text-red-700">
              {fe.giver} → {fe.receiver}: {fe.error}
            </div>
          ))}
          <button className="text-red-700 hover:underline text-sm font-medium mt-2">
            Retry Emails
          </button>
        </div>
      )}

      {/* Modals */}
      <ExclusionsModal
        open={showExclusionModal}
        onClose={() => setShowExclusionModal(false)}
        familyId={familyId as string}
        members={family.members}
        exclusions={family.exclusions}
        onCreated={fetchFamily}
      />
      <DeleteExclusionModal
        exclusion={exclusionToDelete}
        onClose={() => setExclusionToDelete(null)}
        familyId={familyId as string}
        onDeleted={fetchFamily}
      />
    </div>
  );
}

// --------------------------------
// Exclusions Modals (Create/Delete)
// --------------------------------

export interface ModalMember {
  id: number;
  name: string;
}

export interface ModalExclusion {
  memberAId: number;
  memberBId: number;
}

interface ExclusionsModalProps {
  open: boolean;
  onClose: () => void;
  familyId: number | string;
  members: ModalMember[];
  exclusions: ModalExclusion[];
  /** Called after an exclusion is created so the parent can refetch. */
  onCreated: () => void | Promise<void>;
}

function ExclusionsModal({
  open,
  onClose,
  familyId,
  members,
  exclusions,
  onCreated,
}: ExclusionsModalProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const firstId = selected[0];

  // IDs the first-selected member already has an exclusion with
  const alreadyExcluded = new Set<number>();
  if (firstId !== undefined) {
    for (const ex of exclusions) {
      if (ex.memberAId === firstId) alreadyExcluded.add(ex.memberBId);
      if (ex.memberBId === firstId) alreadyExcluded.add(ex.memberAId);
    }
  }

  function isDisabled(memberId: number) {
    // Only restrict once one person is chosen; the chosen one stays clickable to deselect
    if (selected.length === 0 || selected.includes(memberId)) return false;
    return alreadyExcluded.has(memberId);
  }

  function toggle(memberId: number) {
    if (submitting || isDisabled(memberId)) return;

    setError('');
    setSelected((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      if (prev.length >= 2) return prev; // max two people
      return [...prev, memberId];
    });
  }

  async function handleSubmit() {
    if (selected.length !== 2) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/families/${familyId}/host/exclusions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMembershipIdA: selected[0],
          targetMembershipIdB: selected[1],
        }),
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
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];

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
              Pick two people who shouldn&apos;t be matched with each other.
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

        {members.length < 2 ? (
          <p className="text-gray-600">Need at least two participants to add an exclusion.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {members.map((member) => {
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
                  <span className="block">{member.name}</span>
                  {disabled && (
                    <span className="block text-xs font-normal">Already excluded</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedNames.length === 2 && (
          <div className="bg-gray-50 p-3 rounded text-sm">
            {selectedNames[0]} ↔ {selectedNames[1]}
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
            disabled={selected.length !== 2 || submitting}
            className="text-white bg-santa-red px-4 py-2 rounded font-medium hover:bg-red-500 disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Exclusion'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ExclusionToDelete {
  memberAId: number;
  memberBId: number;
  memberA: string;
  memberB: string;
}

interface DeleteExclusionModalProps {
  /** The exclusion being deleted. Pass null to keep the modal closed. */
  exclusion: ExclusionToDelete | null;
  onClose: () => void;
  familyId: number | string;
  /** Called after a successful delete so the parent can refetch. */
  onDeleted: () => void | Promise<void>;
}

function DeleteExclusionModal({
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