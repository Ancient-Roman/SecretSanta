export default function CheckEmailPage() {
  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Check Your Email</h2>
        <p className="text-gray-600">
          We've sent you a magic link. Click it to sign in.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p>
          If you don't see the email, check your spam folder. The link expires in 15 minutes.
        </p>
      </div>

      <a
        href="/"
        className="inline-block text-santa-red hover:underline text-sm font-medium"
      >
        ← Back to home
      </a>
    </div>
  );
}
