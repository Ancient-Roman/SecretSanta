'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFamilySchema } from '@/lib/validation/schemas';

interface Family {
  id: number;
  name: string;
  code: string;
  status: string;
  memberCount: number;
}

export default function HostPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    budget: '',
    exchangeDate: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  async function fetchFamilies() {
    try {
      const response = await fetch('/api/families');
      if (!response.ok) throw new Error('Failed to fetch families');
      const data = await response.json();
      setFamilies(data.families || []);
    } catch (err) {
      console.error('Error fetching families:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFamily(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const validation = createFamilySchema.safeParse({
        name: formData.name,
        budget: formData.budget ? parseInt(formData.budget) : undefined,
        exchangeDate: formData.exchangeDate ? new Date(formData.exchangeDate) : undefined,
      });

      if (!validation.success) {
        setError(validation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const response = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create family');
        setSubmitting(false);
        return;
      }

      const { familyId } = await response.json();
      router.push(`/f/${familyId}`);
    } catch (err) {
      setError('An error occurred');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">My Families</h2>
          <p className="text-gray-600 mt-1">Manage your Secret Santa exchanges</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-santa-red text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition"
        >
          + New Family
        </button>
      </div>

      {showCreateForm && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="text-lg font-bold mb-4">Create New Family</h3>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Family Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., The Smiths"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Budget (optional)</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Exchange Date (optional)</label>
                <input
                  type="date"
                  value={formData.exchangeDate}
                  onChange={(e) => setFormData({ ...formData, exchangeDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-santa-red text-white py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Creating...' : 'Create Family'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600">Loading families...</div>
      ) : families.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No families yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 text-santa-red hover:underline font-medium"
          >
            Create your first family
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {families.map((family) => (
            <div
              key={family.id}
              onClick={() => router.push(`/f/${family.id}`)}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{family.name}</h3>
                  <p className="text-gray-600 text-sm">Code: {family.code}</p>
                  <p className="text-gray-600 text-sm">{family.memberCount} members</p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    family.status === 'open'
                      ? 'bg-blue-100 text-blue-800'
                      : family.status === 'locked'
                      ? 'bg-yellow-100 text-yellow-800'
                      : family.status === 'day_of'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {family.status}
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
