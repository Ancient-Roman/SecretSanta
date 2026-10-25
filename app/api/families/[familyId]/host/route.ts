import { NextRequest, NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { db, memberships, exclusions, assignments } from '@/lib/db';
import { eq, and, isNotNull } from 'drizzle-orm';
import { HostFamily } from '@/app/_components/types/family';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, family } = await requireHost(familyId);

    const familyMembers = await db.query.memberships.findMany({
      where: eq(memberships.familyId, familyId),
    });

    const familyExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.familyId, familyId),
      with: {
        memberA: true,
        memberB: true,
      },
    });

    const failedAssignments = await db.query.assignments.findMany({
      where: and(
        eq(assignments.familyId, familyId),
        isNotNull(assignments.emailError)
      ),
      with: {
        giver: true,
        receiver: true,
      },
    });

    return NextResponse.json<HostFamily>({
      id: family.id,
      name: family.name,
      status: family.status,
      members: familyMembers.map((m) => ({ id: m.id, displayName: m.displayName })),
      exclusions: familyExclusions.map((ex) => ({
        memberA: ex.memberA.displayName,
        memberB: ex.memberB.displayName,
        memberAId: ex.memberAId,
        memberBId: ex.memberBId,
      })),
      failedEmails: failedAssignments.map((a) => ({
        giver: a.giver.displayName,
        receiver: a.receiver.displayName,
        error: a.emailError ?? '',
      })),
    });
  } catch (error) {
    console.error('Get host family error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family' },
      { status: 500 }
    );
  }
}
