'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DeleteExclusionModal } from '@/app/_components/exclusions/deleteExclusionModal';
import { CreateExclusionModal } from '@/app/_components/exclusions/createExclusionModal';
import { HostFamily } from '@/app/_components/types/family';
import { Exclusion } from '@/app/_components/types/exclusion';

export default function HostControlsPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId;
  const isHost = true;

  const [family, setFamily] = useState<HostFamily | null>(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationEmailSaving, setVerificationEmailSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [showExclusionModal, setShowExclusionModal] = useState(false);
  const [exclusionToDelete, setExclusionToDelete] = useState<Exclusion | null>(null);
  const [memberEdits, setMemberEdits] = useState<Record<number, { displayName: string; email: string }>>({});
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);

  useEffect(() => {
    fetchFamily();
  }, [familyId]);

  async function fetchFamily() {
    try {
      const response = await fetch(`/api/families/${familyId}/host`);
      if (!response.ok) throw new Error('Failed to fetch family');
      const data = await response.json();
      setFamily(data);
      setVerificationEmail(data.verificationEmail || '');
      setMemberEdits(
        Object.fromEntries(
          (data.members || [])
            .filter((member: any) => !member.isHost)
            .map((member: any) => [
              member.id,
              {
                displayName: member.displayName,
                email: member.email || '',
              },
            ])
        )
      );
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

  async function handleSaveVerificationEmail() {
    setVerificationEmailSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/families/${familyId}/host`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save verification email');
      }

      await fetchFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save verification email');
    } finally {
      setVerificationEmailSaving(false);
    }
  }

  async function handleReturnToLocked() {
    if (!window.confirm('Revert day-of mode back to locked?')) return;

    try {
      const response = await fetch(`/api/families/${familyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revert to locked');
      }

      await fetchFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert to locked');
    }
  }

  async function handleUnlockFamily() {
    if (!window.confirm('Unlock this family and delete all current assignments?')) return;

    try {
      const response = await fetch(`/api/families/${familyId}/host`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unlock family');
      }

      await fetchFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock family');
    }
  }

  async function handleMemberSave(memberId: number) {
    const nextValues = memberEdits[memberId];
    if (!nextValues) return;

    setSavingMemberId(memberId);
    setError('');

    try {
      const response = await fetch(`/api/families/${familyId}/host`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          displayName: nextValues.displayName,
          email: nextValues.email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member');
      }

      await fetchFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSavingMemberId(null);
    }
  }

  async function handleDeleteMember(memberId: number) {
    if (!window.confirm('Remove this family member from the family?')) return;

    setDeletingMemberId(memberId);
    setError('');

    try {
      const response = await fetch(`/api/families/${familyId}/host`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete member');
      }

      await fetchFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member');
    } finally {
      setDeletingMemberId(null);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!family) return <div>Family not found</div>;

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  const otherMembers = family.members.filter((member) => !member.isHost);
  const isMemberDirty = (memberId: number) => {
    const draft = memberEdits[memberId];
    const current = family.members.find((member) => member.id === memberId);
    if (!draft || !current) return false;
    return (
      draft.displayName !== current.displayName ||
      (draft.email ?? '') !== (current.email ?? '')
    );
  };

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

      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-bold">Assignment Verification Email</h3>
        <p className="text-sm text-gray-600">Optional. If filled in, a full assignment digest is sent to this address as soon as names are drawn.</p>
        <div className="flex gap-3 flex-wrap items-end">
          <label className="flex-1 min-w-[220px] text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={verificationEmail}
              onChange={(event) => setVerificationEmail(event.target.value)}
              placeholder="auditor@example.com"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
          <button
            onClick={handleSaveVerificationEmail}
            disabled={verificationEmailSaving || verificationEmail === (family.verificationEmail || '')}
            className="bg-santa-red text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {verificationEmailSaving ? 'Saving...' : 'Save email'}
          </button>
        </div>
      </div>

      {family.status === 'open' && (
        <div className="bg-santa-red text-white rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold">Ready to Draw Names?</h3>
          <p className="text-sm opacity-90">{family.members.length} participants</p>
          <button
            onClick={handleDrawNames}
            disabled={drawing || family.members.length < 3}
            className="bg-white text-santa-red px-4 py-2 rounded font-medium hover:bg-red-50 disabled:opacity-50"
            title={family.members.length < 3 ? 'At least 3 participants are required to draw names' : ''}
          >
            {drawing ? 'Drawing...' : 'Draw Secret Santa Names'}
          </button>
        </div>
      )}

      {family.status === 'locked' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold">Locked Family</h3>
          <p className="text-sm text-purple-700">You can unlock and fix the participant list or assignments before starting the reveal.</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleUnlockFamily}
              className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700"
            >
              Unlock and Clear Assignments
            </button>
            <button
              onClick={handleStartDayOf}
              className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700"
            >
              Go to Reveal Page
            </button>
          </div>
        </div>
      )}

      {family.status === 'day_of' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
          <p className="text-yellow-800 font-medium">Day-of mode active</p>
          <div className="flex gap-3 flex-wrap">
            <a href={`/f/${familyId}/day-of`} className="text-yellow-700 hover:underline font-medium">
              Go to reveal page →
            </a>
            <button
              onClick={handleReturnToLocked}
              className="bg-yellow-700 text-white px-3 py-2 rounded font-medium hover:bg-yellow-800"
            >
              Revert to Locked
            </button>
          </div>
        </div>
      )}

      {family.status === 'open' && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Family Members</h3>
          {otherMembers.length === 0 ? (
            <p className="text-gray-600">No additional members yet.</p>
          ) : (
            <div className="space-y-3">
              {otherMembers.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Name
                      <input
                        value={memberEdits[member.id]?.displayName ?? member.displayName}
                        onChange={(event) =>
                          setMemberEdits((current) => ({
                            ...current,
                            [member.id]: {
                              displayName: event.target.value,
                              email: current[member.id]?.email ?? member.email ?? '',
                            },
                          }))
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      Email
                      <input
                        type="email"
                        value={memberEdits[member.id]?.email ?? member.email ?? ''}
                        onChange={(event) =>
                          setMemberEdits((current) => ({
                            ...current,
                            [member.id]: {
                              displayName: current[member.id]?.displayName ?? member.displayName,
                              email: event.target.value,
                            },
                          }))
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMemberSave(member.id)}
                      disabled={savingMemberId === member.id || !isMemberDirty(member.id)}
                      className="bg-santa-red text-white px-3 py-2 rounded font-medium disabled:opacity-50"
                    >
                      {savingMemberId === member.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      disabled={deletingMemberId === member.id}
                      className="bg-gray-200 text-gray-800 px-3 py-2 rounded font-medium disabled:opacity-50"
                    >
                      {deletingMemberId === member.id ? 'Removing...' : 'Remove member'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-bold">All Exclusions ({family.exclusions.length})</h3>
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
            {'Add Host Exclusions'}
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

      <CreateExclusionModal
        open={showExclusionModal}
        onClose={() => setShowExclusionModal(false)}
        familyId={familyId as string}
        members={family.members}
        exclusions={family.exclusions}
        onCreated={fetchFamily}
        isHost={isHost}
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
