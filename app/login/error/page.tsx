import { Suspense } from 'react';

export default async function LoginCallbackPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;

  if (error === 'missing') {
    return (
      <div className="text-center max-w-md mx-auto space-y-4 mt-20">
        <h2 className="text-xl font-bold text-red-600">Invalid Link</h2>
        <p className="text-gray-600">The magic link is missing or invalid.</p>
        <a href="/" className="inline-block text-santa-red hover:underline">
          ← Try again
        </a>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div className="text-center max-w-md mx-auto space-y-4 mt-20">
        <h2 className="text-xl font-bold text-red-600">Link Expired or Used</h2>
        <p className="text-gray-600">Please request a new magic link.</p>
        <a href="/" className="inline-block text-santa-red hover:underline">
          ← Try again
        </a>
      </div>
    );
  }

  if (error === 'server') {
    return (
      <div className="text-center max-w-md mx-auto space-y-4 mt-20">
        <h2 className="text-xl font-bold text-red-600">Something Went Wrong</h2>
        <p className="text-gray-600">Please try signing in again.</p>
        <a href="/" className="inline-block text-santa-red hover:underline">
          ← Try again
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-santa-red"></div>
        </div>
        <p className="mt-4 text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
