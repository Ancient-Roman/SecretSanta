import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Secret Santa',
  description: 'A free, simple Secret Santa coordinator for families',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-santa-red">🎅 Secret Santa</h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-4 text-center text-gray-600 text-sm">
            <p>Free Secret Santa coordinator for families</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
