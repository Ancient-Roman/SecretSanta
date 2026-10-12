'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Assignment {
  id: number;
  receiverName: string;
  giverName: string;
  revealed: boolean;
}

export default function DayOfPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, [familyId]);

  async function fetchAssignments() {
    try {
      const response = await fetch(`/api/families/${familyId}/reveal`);
      if (!response.ok) throw new Error('Failed to fetch reveals');
      const data = await response.json();
      setAssignments(data.assignments);
      setRevealed(data.revealed);
      setTotal(data.total);
    } catch (err) {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal(assignmentId: number) {
    try {
      const response = await fetch(`/api/families/${familyId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (!response.ok) throw new Error('Failed to reveal');

      // Update local state
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, revealed: true } : a
        )
      );
      setRevealed((prev) => prev + 1);
    } catch (err) {
      alert('Failed to reveal');
    }
  }

  async function handleComplete() {
    if (!window.confirm('Mark event as completed?')) return;

    try {
      const response = await fetch(`/api/families/${familyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) throw new Error('Failed to complete');

      router.push(`/f/${familyId}`);
    } catch (err) {
      alert('Failed to complete event');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Secret Santa Reveal 🎁</h2>
        <a href={`/f/${familyId}/host`} className="text-gray-600 hover:text-gray-900">
          ← Back
        </a>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="font-medium">Progress: {revealed} of {total} revealed</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition"
          >
            <h3 className="text-lg font-bold mb-4">🎄 {assignment.receiverName}</h3>

            {assignment.revealed ? (
              <div className="bg-santa-red text-white rounded-lg p-4 text-center">
                <p className="text-sm opacity-75 mb-1">is receiving from</p>
                <p className="text-2xl font-bold">{assignment.giverName}</p>
              </div>
            ) : (
              <button
                onClick={() => handleReveal(assignment.id)}
                className="w-full bg-santa-red text-white py-3 rounded-lg font-medium hover:bg-red-700 transition"
              >
                Click to Reveal →
              </button>
            )}
          </div>
        ))}
      </div>

      {revealed === total && total > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-green-800">All Reveals Complete! 🎉</h3>
          <button
            onClick={handleComplete}
            className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700"
          >
            Mark Event as Completed
          </button>
        </div>
      )}
    </div>
  );
}
