import { NextRequest, NextResponse } from 'next/server';
import { requireHost, requireStatus } from '@/lib/auth/guards';
import { db, assignments } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const revealSchema = z.object({
  assignmentId: z.number().int().positive(),
});

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session } = await requireHost(familyId);
    await requireStatus(familyId, 'day_of');

    const body = await request.json();
    const validation = revealSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { assignmentId } = validation.data;

    // Mark as revealed
    const result = await db
      .update(assignments)
      .set({ revealedAt: new Date() })
      .where(
        and(
          eq(assignments.id, assignmentId),
          eq(assignments.familyId, familyId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reveal error:', error);
    return NextResponse.json(
      { error: 'Failed to reveal assignment' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session } = await requireHost(familyId);
    await requireStatus(familyId, 'day_of');

    // Get all assignments with reveal status
    const allAssignments = await db.query.assignments.findMany({
      where: eq(assignments.familyId, familyId),
      with: {
        giver: {
          with: { user: true },
        },
        receiver: true,
      },
    });

    return NextResponse.json({
      assignments: allAssignments.map((a) => ({
        id: a.id,
        receiverName: a.receiver.displayName,
        giverName: a.giver.displayName,
        revealed: !!a.revealedAt,
      })),
      total: allAssignments.length,
      revealed: allAssignments.filter((a) => a.revealedAt).length,
    });
  } catch (error) {
    console.error('Get reveals error:', error);
    return NextResponse.json(
      { error: 'Failed to get reveals' },
      { status: 500 }
    );
  }
}
