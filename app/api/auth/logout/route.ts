import { clearSessionCookie } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export async function GET() {
  await clearSessionCookie();
  redirect('/');
}
