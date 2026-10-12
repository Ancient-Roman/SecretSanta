import { NextRequest, NextResponse } from 'next/server';
import { requireHost, requireStatus } from '@/lib/auth/guards';
import { db, families } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, family } = await requireHost(familyId);

    if (family.status !== 'locked') {
      return NextResponse.json(
        { error: 'Family must be locked to start day-of' },
        { status: 400 }
      );
    }

    const result = await db
      .update(families)
      .set({
        status: 'day_of',
        updatedAt: new Date(),
      })
      .where(eq(families.id, familyId))
      .returning();

    return NextResponse.json({ family: result[0] });
  } catch (error) {
    console.error('Start day-of error:', error);
    return NextResponse.json(
      { error: 'Failed to start day-of' },
      { status: 500 }
    );
  }
}
