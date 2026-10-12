'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { joinFamilySchema } from '@/lib/validation/schemas';

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get('code')?.toUpperCase() || '';

  const [code, setCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'code' | 'details'>('code');
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/families/by-code', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      // Actually, we need a better endpoint. Let me think about this differently.
      // We should verify the code exists and is open before moving to details step.

      setLoading(false);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validation = joinFamilySchema.safeParse({
        code,
        displayName,
      });

      if (!validation.success) {
        setError(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          displayName,
          email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to join family');
        setLoading(false);
        return;
      }

      router.push('/check-email');
    } catch (err) {
        console.error(err);
      setError('An error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Join a Family</h2>
        <p className="text-gray-600">
          Join a Secret Santa exchange with a family code
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      {step === 'code' ? (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
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
            <p className="text-xs text-gray-600 mt-1">
              Ask your host for the 6-character family code
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep('details')}
            disabled={loading || code.length !== 6}
            className="w-full bg-santa-red text-white py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50 transition"
          >
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('code')}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-medium hover:bg-gray-300 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-santa-red text-white py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      )}

      <div className="border-t pt-4">
        <a href="/" className="text-santa-red hover:underline text-sm font-medium">
          ← Back
        </a>
      </div>
    </div>
  );
}
