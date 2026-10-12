import { NextRequest, NextResponse } from 'next/server';
import { db, families, loginTokens } from '@/lib/db';
import { z } from 'zod';
import { generateMagicToken, hashToken } from '@/lib/auth/tokens';
import { sendEmail } from '@/lib/email/send';
import { eq } from 'drizzle-orm';

const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const joinSchema = z.object({
  code: z.string().length(6),
  displayName: z.string().min(1).max(255),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = joinSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, displayName, email } = validation.data;

    // Find family by code
    const family = await db.query.families.findFirst({
      where: eq(families.code, code),
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Family code not found' },
        { status: 404 }
      );
    }

    if (!family.joinEnabled) {
      return NextResponse.json(
        { error: 'This family is no longer accepting new members' },
        { status: 403 }
      );
    }

    if (family.status !== 'open') {
      return NextResponse.json(
        { error: 'This family is not currently open for joining' },
        { status: 403 }
      );
    }

    // Generate magic token for member
    const token = generateMagicToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY);

    // Pass join info in URL
    const magicLink = `${APP_URL}/login/callback?token=${token}&familyCode=${code}&displayName=${encodeURIComponent(displayName)}`;

    // Store token with email
    await db.insert(loginTokens).values({
      email,
      tokenHash,
      expiresAt,
    });

    // Send invitation email
    const text = `You're invited to join the ${family.name} Secret Santa: ${magicLink}`;
    const html = `
      <p>You're invited to join the <strong>${family.name}</strong> Secret Santa!</p>
      <p><a href="${magicLink}" style="color: #C41E3A; text-decoration: none;">Click here to join</a></p>
      <p style="color: #999; font-size: 12px;">This link expires in 15 minutes.</p>
    `;

    await sendEmail({
      to: email,
      subject: `Join the ${family.name} Secret Santa`,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json(
      { error: 'Failed to join family' },
      { status: 500 }
    );
  }
}
