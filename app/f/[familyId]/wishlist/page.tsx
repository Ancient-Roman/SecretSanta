'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  WishlistItemModal,
  WishlistItem,
} from '@/app/_components/wishlist/editWishlistItemModal';

export default function WishlistPage() {
  const params = useParams();
  const familyId = params.familyId;

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
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

  function handleSavedItem(savedItem: WishlistItem, mode: 'add' | 'edit') {
    if (mode === 'add') {
      setItems((currentItems) => [...currentItems, savedItem]);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => (item.id === savedItem.id ? savedItem : item))
    );
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

      <div className="space-y-4">
        <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setModalMode('add');
            }}
            className="w-full rounded bg-santa-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
        >
          Add Item
        </button>

        <h3 className="font-bold text-lg">Your Items ({items.length})</h3>

        {items.length === 0 ? (
          <p className="text-gray-600 italic">No items yet. Use Add Item to create your first wish.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">{item.title}</h4>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setModalMode('edit');
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
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

      {(modalMode === 'edit' || modalMode === 'add') && (
        <WishlistItemModal
          open
          mode={modalMode}
          item={modalMode === 'edit' ? editingItem : null}
          familyId={String(familyId)}
          onClose={() => {
            setModalMode(null);
            setEditingItem(null);
          }}
          onSaved={handleSavedItem}
        />
      )}
    </div>
  );
}
