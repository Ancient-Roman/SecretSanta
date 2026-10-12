'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { loginSchema, joinFamilySchema } from '@/lib/validation/schemas';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'join' | 'host'>('join');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validation = joinFamilySchema.safeParse({
        code: code.toUpperCase(),
        displayName,
        email,
      });

      if (!validation.success) {
        console.error('Validation error:', validation.error);
        setError(validation.error.errors[0].message);
        return;
      }

      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          displayName,
          email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to join family');
        return;
      }

      router.push('/check-email');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleHostSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validation = loginSchema.safeParse({ email });

      if (!validation.success) {
        setError(validation.error.errors[0].message);
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to sign in');
        return;
      }

      router.push('/check-email');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-santa-red">Secret Santa</h2>
        <p className="text-xl text-gray-600">
          Simple, free Secret Santa coordinator for families
        </p>
      </div>

      <div className="max-w-md mx-auto border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('join');
              setError('');
            }}
            className={`flex-1 px-4 py-3 font-medium transition ${
              activeTab === 'join'
                ? 'bg-santa-red text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Join a Family
          </button>
          <button
            onClick={() => {
              setActiveTab('host');
              setError('');
            }}
            className={`flex-1 px-4 py-3 font-medium transition ${
              activeTab === 'host'
                ? 'bg-santa-red text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Host Sign In
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'join' ? (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Family Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-lg font-mono tracking-widest text-center"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Your Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Sarah"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                disabled={loading}
                />
                <p className="text-xs text-gray-600 mt-1">
                We'll send you a magic link to confirm
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-santa-red text-white py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50 transition"
              >
                {loading ? 'Joining...' : 'Join Family'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleHostSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-600">
                We'll send you a magic link to sign in.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-santa-red text-white py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50 transition"
              >
                {loading ? 'Sending Link...' : 'Sign In with Magic Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
