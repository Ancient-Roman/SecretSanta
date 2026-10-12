'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FamilyMembership {
  familyId: number;
  familyName: string;
  displayName: string;
  status: string;
}

export default function FamiliesPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<FamilyMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberships();
  }, []);

  async function fetchMemberships() {
    try {
      const response = await fetch('/api/members/families');
      if (!response.ok) throw new Error('Failed to fetch families');
      const data = await response.json();
      setMemberships(data.families || []);
    } catch (err) {
      console.error('Error fetching families:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">My Families</h2>
          <p className="text-gray-600 mt-1">Families you're part of</p>
        </div>
        <a
          href="/join"
          className="bg-santa-red text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition"
        >
          + Join Family
        </a>
      </div>

      {loading ? (
        <div className="text-center text-gray-600">Loading families...</div>
      ) : memberships.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">You're not part of any families yet</p>
          <a
            href="/join"
            className="mt-4 inline-block text-santa-red hover:underline font-medium"
          >
            Join a family with a code
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {memberships.map((m) => (
            <div
              key={m.familyId}
              onClick={() => router.push(`/f/${m.familyId}`)}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{m.familyName}</h3>
                  <p className="text-gray-600 text-sm">You are: {m.displayName}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    m.status === 'open'
                      ? 'bg-blue-100 text-blue-800'
                      : m.status === 'locked'
                      ? 'bg-yellow-100 text-yellow-800'
                      : m.status === 'day_of'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-4">
        <a
          href="/api/auth/logout"
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          Sign out
        </a>
      </div>
    </div>
  );
}
