'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface HostFamily {
  id: number;
  name: string;
  status: string;
  members: Array<{ id: number; name: string }>;
  exclusions: Array<{ memberA: string; memberB: string }>;
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{family.name} - Host Controls</h2>
        <a href={`/f/${familyId}`} className="text-gray-600 hover:text-gray-900">
          ← Back
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium">Status: <span className="text-blue-800">{family.status}</span></p>
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
          <div className="space-y-2">
            {family.exclusions.map((ex, i) => (
              <div key={i} className="bg-gray-50 p-3 rounded text-sm">
                {ex.memberA} ↔ {ex.memberB}
              </div>
            ))}
          </div>
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
    </div>
  );
}
