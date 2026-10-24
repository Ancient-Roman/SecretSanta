import { NextRequest, NextResponse } from 'next/server';
import { db, loginTokens, users } from '@/lib/db';
import { loginSchema } from '@/lib/validation/schemas';
import { generateMagicToken, hashToken } from '@/lib/auth/tokens';
import { sendEmail } from '@/lib/email/send';
import { eq } from 'drizzle-orm';

const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const email = validation.data.email;  // already trimmed + lowercased by the schema

    const hostEmails = (process.env.HOST_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isHostEmail = hostEmails.includes(email);

    const existingUser = isHostEmail
      ? null
      : await db.query.users.findFirst({ where: eq(users.email, email) });

    // Only send a link if this email is a host or has already joined a family.
    // Either way, return the same response so nobody can probe who's registered.
    if (isHostEmail || existingUser) {
      const token = generateMagicToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY);

      await db.insert(loginTokens).values({ email, tokenHash, expiresAt });

      const magicLink = `${APP_URL}/login/callback?token=${token}`;
      const text = `Sign in to Secret Santa: ${magicLink}`;
      const html = `
        <p>Sign in to your Secret Santa account:</p>
        <p><a href="${magicLink}" style="color: #C41E3A; text-decoration: none;">Click here to sign in</a></p>
        <p style="color: #999; font-size: 12px;">This link expires in 15 minutes.</p>
      `;

      await sendEmail({
        to: email,
        subject: 'Your Secret Santa Magic Link',
        text,
        html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
