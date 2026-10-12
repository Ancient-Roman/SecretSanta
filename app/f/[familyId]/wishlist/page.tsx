'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface WishlistItem {
  id: number;
  title: string;
  url?: string;
  notes?: string;
}

export default function WishlistPage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId;

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', url: '', notes: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWishlist();
  }, [familyId]);

  async function fetchWishlist() {
    try {
      const response = await fetch(`/api/families/${familyId}/wishlist`);
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    setAdding(true);
    setError('');

    try {
      const response = await fetch(`/api/families/${familyId}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to add item');
        setAdding(false);
        return;
      }

      const { item } = await response.json();
      setItems([...items, item]);
      setNewItem({ title: '', url: '', notes: '' });
    } catch (err) {
      setError('An error occurred');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteItem(id: number) {
    if (!window.confirm('Delete this item?')) return;

    try {
      const response = await fetch(`/api/families/${familyId}/wishlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id }),
      });

      if (!response.ok) throw new Error('Failed to delete');

      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      alert('Failed to delete item');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">My Wishlist</h2>
        <a href={`/f/${familyId}`} className="text-gray-600 hover:text-gray-900">
          ← Back
        </a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleAddItem} className="space-y-4 border border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-lg">Add Item to Wishlist</h3>

        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="e.g., Sony Headphones"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            disabled={adding}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL (optional)</label>
          <input
            type="url"
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded"
            disabled={adding}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={newItem.notes}
            onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
            placeholder="e.g., Size L, Black color preferred"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows={3}
            disabled={adding}
          />
        </div>

        <button
          type="submit"
          disabled={adding || !newItem.title.trim()}
          className="w-full bg-santa-red text-white py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50 transition"
        >
          {adding ? 'Adding...' : 'Add Item'}
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">Your Items ({items.length})</h3>

        {items.length === 0 ? (
          <p className="text-gray-600 italic">No items yet. Add your first wish above!</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">{item.title}</h4>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-santa-red hover:underline text-sm"
                  >
                    View link →
                  </a>
                )}

                {item.notes && <p className="text-sm text-gray-600">{item.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
