import { NextRequest, NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { db, memberships, exclusions, assignments, users, families } from '@/lib/db';
import { eq, and, isNotNull, or } from 'drizzle-orm';
import { HostFamily } from '@/app/_components/types/family';
import { z } from 'zod';

export const updateMemberSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  displayName: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().optional(),
}).passthrough();

export const updateFamilySettingsSchema = z.object({
  verificationEmail: z.string().trim().email().or(z.literal('')).optional(),
}).passthrough();

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { family } = await requireHost(familyId);

    const familyMembers = await db.query.memberships.findMany({
      where: eq(memberships.familyId, familyId),
      with: {
        user: true,
      },
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
      verificationEmail: family.verificationEmail ?? null,
      members: familyMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        displayName: m.displayName,
        email: m.user?.email,
        isHost: m.userId === family.hostUserId,
      })),
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

/** Update family member name and email, or family verification email */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, family } = await requireHost(familyId);
    const body = await request.json();

    if ('verificationEmail' in body) {
      const validation = updateFamilySettingsSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const { verificationEmail } = validation.data;
      const nextValue = verificationEmail?.trim().toLowerCase() ?? '';

      await db
        .update(families)
        .set({
          verificationEmail: nextValue || null,
          updatedAt: new Date(),
        })
        .where(eq(families.id, familyId));

      return NextResponse.json({ success: true });
    }

    const validation = updateMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { memberId, displayName, email } = validation.data;

    const member = await db.query.memberships.findFirst({
      where: and(eq(memberships.id, memberId), eq(memberships.familyId, familyId)),
      with: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.userId === session.userId) {
      return NextResponse.json(
        { error: 'You cannot edit your own family record here' },
        { status: 400 }
      );
    }

    if (family.status !== 'open') {
      return NextResponse.json(
        { error: 'Family members can only be edited while the group is open' },
        { status: 400 }
      );
    }

    if (displayName) {
      await db
        .update(memberships)
        .set({ displayName: displayName.trim() })
        .where(eq(memberships.id, memberId));
    }

    if (email) {
      await db
        .update(users)
        .set({ email: email.trim().toLowerCase() })
        .where(eq(users.id, member.userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

/** Delete a family member */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, family } = await requireHost(familyId);
    const { memberId } = await request.json();

    if (!memberId || Number.isNaN(Number(memberId))) {
      return NextResponse.json({ error: 'Member id is required' }, { status: 400 });
    }

    const member = await db.query.memberships.findFirst({
      where: and(eq(memberships.id, Number(memberId)), eq(memberships.familyId, familyId)),
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.userId === session.userId) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from your own family from here' },
        { status: 400 }
      );
    }

    if (family.status !== 'open') {
      return NextResponse.json(
        { error: 'Family members can only be removed while the group is open' },
        { status: 400 }
      );
    }

    await db
      .delete(exclusions)
      .where(or(eq(exclusions.memberAId, member.id), eq(exclusions.memberBId, member.id)));

    await db
      .delete(assignments)
      .where(
        or(
          eq(assignments.giverMembershipId, member.id),
          eq(assignments.receiverMembershipId, member.id)
        )
      );

    await db.delete(memberships).where(eq(memberships.id, member.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}

/** Reopen a locked family and clear all assignments */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { family } = await requireHost(familyId);
    const body = await request.json();

    if (body.action !== 'unlock') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    if (family.status !== 'locked') {
      return NextResponse.json(
        { error: 'Only a locked family can be unlocked' },
        { status: 400 }
      );
    }

    await db.delete(assignments).where(eq(assignments.familyId, familyId));

    await db
      .update(families)
      .set({
        status: 'open',
        updatedAt: new Date(),
      })
      .where(eq(families.id, familyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlock family error:', error);
    return NextResponse.json(
      { error: 'Failed to unlock family' },
      { status: 500 }
    );
  }
}
