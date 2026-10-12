import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/guards';
import { db, memberships } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const userMemberships = await db.query.memberships.findMany({
      where: eq(memberships.userId, session.userId),
      with: {
        family: true,
      },
    });

    return NextResponse.json({
      families: userMemberships.map((m) => ({
        familyId: m.familyId,
        familyName: m.family.name,
        displayName: m.displayName,
        status: m.family.status,
      })),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Get member families error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch families' },
      { status: 500 }
    );
  }
}
