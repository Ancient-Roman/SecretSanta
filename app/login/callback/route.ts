import { db, loginTokens, users, memberships, families } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { createSessionToken, hashToken } from '@/lib/auth/tokens';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const familyCode = request.nextUrl.searchParams.get('familyCode');
    const displayName = request.nextUrl.searchParams.get('displayName');

    if (!token) {
      return NextResponse.redirect(new URL('/login/callback?error=missing', request.url));
    }

    const tokenHash = hashToken(token);

    // Find the token in DB
    const loginToken = await db.query.loginTokens.findFirst({
      where: eq(loginTokens.tokenHash, tokenHash),
    });

    if (
      !loginToken ||
      loginToken.usedAt ||
      new Date(loginToken.expiresAt) < new Date()
    ) {
      return NextResponse.redirect(new URL('/login/callback?error=expired', request.url));
    }

    // Get or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, loginToken.email),
    });

    if (!user) {
      const result = await db
        .insert(users)
        .values({ email: loginToken.email })
        .returning();
      user = result[0];
    }

    // Mark token as used
    await db
      .update(loginTokens)
      .set({ usedAt: new Date() })
      .where(eq(loginTokens.id, loginToken.id));

    // If this is a family join, add user to family
    if (familyCode && displayName) {
      const family = await db.query.families.findFirst({
        where: eq(families.code, familyCode),
      });

      if (family) {
        // Check if already a member
        const existing = await db.query.memberships.findFirst({
          where: and(
            eq(memberships.familyId, family.id),
            eq(memberships.userId, user.id)
          ),
        });

        if (!existing) {
          await db.insert(memberships).values({
            familyId: family.id,
            userId: user.id,
            displayName: decodeURIComponent(displayName),
            isParticipant: true,
          });
        }
      }
    }

    // Check if user is a host
    const hostEmails = (process.env.HOST_EMAILS || '').split(',').map((e) => e.trim());
    const isHost = hostEmails.includes(user.email);

    // Create session
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      isHost,
    });

    // Determine redirect URL
    let redirectUrl = isHost ? '/host' : '/families';
    if (familyCode) {
      const family = await db.query.families.findFirst({
        where: eq(families.code, familyCode),
      });
      if (family) {
        redirectUrl = `/f/${family.id}`;
      }
    }

    // Create redirect response
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('ss_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login/callback?error=server', request.url));
  }
}
