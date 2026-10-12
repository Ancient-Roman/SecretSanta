import { NextRequest, NextResponse } from 'next/server';
import { requireMember, requireHost, requireStatus, UnauthorizedError } from '@/lib/auth/guards';
import { db, families } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);

    const family = await db.query.families.findFirst({
      where: eq(families.id, familyId),
      with: {
        memberships: {
          with: {
            user: true,
            wishlistItems: {
              orderBy: (items) => items.position,
            },
          },
        },
        assignments: true,
        exclusions: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Find user's assignment if family is locked
    let myAssignment = null;
    if (family.status !== 'open') {
      const assignment = family.assignments.find(
        (a) => a.giverMembershipId === membership.id
      );
      if (assignment) {
        const receiver = family.memberships.find(
          (m) => m.id === assignment.receiverMembershipId
        );
        myAssignment = {
          receiver: receiver?.displayName || 'Unknown',
          budget: family.budget,
          exchangeDate: family.exchangeDate,
        };
      }
    }

    return NextResponse.json({
      id: family.id,
      name: family.name,
      code: family.code,
      status: family.status,
      budget: family.budget,
      exchangeDate: family.exchangeDate,
      isHost: family.hostUserId === session.userId,
      myAssignment,
      members: family.memberships
        .filter((m) => m.isParticipant || m.userId === session.userId)
        .map((m) => ({
          id: m.id,
          displayName: m.displayName,
          isYou: m.userId === session.userId,
          wishlistItems: m.wishlistItems,
        })),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Get family error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family' },
      { status: 500 }
    );
  }
}

const updateFamilySchema = z.object({
  status: z.enum(['open', 'locked', 'day_of', 'completed']).optional(),
});

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, family } = await requireHost(familyId);

    const body = await request.json();
    const validation = updateFamilySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { status } = validation.data;

    if (status === 'day_of') {
      // Transition from locked to day_of
      if (family.status !== 'locked') {
        return NextResponse.json(
          { error: 'Family must be locked to start day-of' },
          { status: 400 }
        );
      }
    }

    if (status === 'completed') {
      // Transition from day_of to completed
      if (family.status !== 'day_of') {
        return NextResponse.json(
          { error: 'Family must be in day-of to complete' },
          { status: 400 }
        );
      }
    }

    const result = await db
      .update(families)
      .set({
        status: status || family.status,
        completedAt: status === 'completed' ? new Date() : family.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(families.id, familyId))
      .returning();

    return NextResponse.json({ family: result[0] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Update family error:', error);
    return NextResponse.json(
      { error: 'Failed to update family' },
      { status: 500 }
    );
  }
}
