import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/guards';
import { db, families, memberships } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createFamilySchema } from '@/lib/validation/schemas';
import { generateFamilyCode } from '@/lib/auth/tokens';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get families where user is host
    const userFamilies = await db.query.families.findMany({
      where: eq(families.hostUserId, session.userId),
      with: {
        memberships: true,
      },
    });

    return NextResponse.json({
      families: userFamilies.map((f) => ({
        id: f.id,
        name: f.name,
        code: f.code,
        status: f.status,
        memberCount: f.memberships.length,
      })),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Get families error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch families' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (!session.isHost) {
      return NextResponse.json(
        { error: 'Unauthorized: Host access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createFamilySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, budget, exchangeDate, hostName } = validation.data;
    const code = generateFamilyCode();

    const result = await db
      .insert(families)
      .values({
        name,
        code,
        budget,
        exchangeDate,
        hostUserId: session.userId,
        status: 'open',
      })
      .returning();

    const newFamily = result[0];

    // Add host as participant member
    await db.insert(memberships).values({
      familyId: newFamily.id,
      userId: session.userId,
      displayName: hostName || 'Host',
      isParticipant: true,
    });

    return NextResponse.json({ family: newFamily });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Create family error:', error);
    return NextResponse.json(
      { error: 'Failed to create family' },
      { status: 500 }
    );
  }
}
