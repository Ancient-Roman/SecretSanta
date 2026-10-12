import { NextRequest, NextResponse } from 'next/server';
import { requireMember, requireStatus } from '@/lib/auth/guards';
import { db, exclusions, memberships, families } from '@/lib/db';
import { eq, and, or } from 'drizzle-orm';
import { addExclusionSchema, removeExclusionSchema } from '@/lib/validation/schemas';
import { sendEmail } from '@/lib/email/send';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);
    await requireStatus(familyId, 'open');

    const body = await request.json();
    const validation = addExclusionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { targetMembershipId } = validation.data;

    // Verify target is in same family
    const targetMember = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.id, targetMembershipId),
        eq(memberships.familyId, familyId)
      ),
      with: { user: true },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Target member not found' },
        { status: 404 }
      );
    }

    // Create symmetric pair (smaller ID first)
    const minId = Math.min(membership.id, targetMembershipId);
    const maxId = Math.max(membership.id, targetMembershipId);

    // Check if already exists
    const existing = await db.query.exclusions.findFirst({
      where: and(
        eq(exclusions.familyId, familyId),
        eq(exclusions.memberAId, minId),
        eq(exclusions.memberBId, maxId)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Exclusion already exists' },
        { status: 400 }
      );
    }

    // Get current user name for email
    const currentUser = await db.query.memberships.findFirst({
      where: eq(memberships.id, membership.id),
    });

    const family = await db.query.families.findFirst({
      where: eq(families.id, familyId),
    });

    // Create exclusion
    const result = await db
      .insert(exclusions)
      .values({
        familyId,
        memberAId: minId,
        memberBId: maxId,
        createdByMembershipId: membership.id,
      })
      .returning();

    // Send emails to both parties
    const emailText = `${currentUser?.displayName} has set an exclusion so you and ${targetMember.displayName} won't be matched in the ${family?.name} Secret Santa.`;
    const emailHtml = `<p><strong>${currentUser?.displayName}</strong> has set an exclusion so you and <strong>${targetMember.displayName}</strong> won't be matched in the <strong>${family?.name}</strong> Secret Santa.</p>`;

    try {
      await sendEmail({
        to: targetMember.user.email,
        subject: `Exclusion set in ${family?.name}`,
        text: emailText,
        html: emailHtml,
      });
    } catch (err) {
      console.error('Error sending exclusion email:', err);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ exclusion: result[0] });
  } catch (error) {
    console.error('Add exclusion error:', error);
    return NextResponse.json(
      { error: 'Failed to add exclusion' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, membership } = await requireMember(familyId);
    await requireStatus(familyId, 'open');

    const body = await request.json();
    const validation = removeExclusionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { targetMembershipId } = validation.data;

    const minId = Math.min(membership.id, targetMembershipId);
    const maxId = Math.max(membership.id, targetMembershipId);

    const exclusion = await db.query.exclusions.findFirst({
      where: and(
        eq(exclusions.familyId, familyId),
        eq(exclusions.memberAId, minId),
        eq(exclusions.memberBId, maxId)
      ),
    });

    if (!exclusion) {
      return NextResponse.json(
        { error: 'Exclusion not found' },
        { status: 404 }
      );
    }

    // Send removal email
    const targetMember = await db.query.memberships.findFirst({
      where: eq(memberships.id, targetMembershipId),
      with: { user: true },
    });

    const currentUser = await db.query.memberships.findFirst({
      where: eq(memberships.id, membership.id),
    });

    const family = await db.query.families.findFirst({
      where: eq(families.id, familyId),
    });

    const emailText = `${currentUser?.displayName} has removed an exclusion. You and ${targetMember?.displayName} can now be matched in the ${family?.name} Secret Santa.`;
    const emailHtml = `<p><strong>${currentUser?.displayName}</strong> has removed an exclusion. You and <strong>${targetMember?.displayName}</strong> can now be matched in the <strong>${family?.name}</strong> Secret Santa.</p>`;

    try {
      await sendEmail({
        to: targetMember?.user.email || '',
        subject: `Exclusion removed in ${family?.name}`,
        text: emailText,
        html: emailHtml,
      });
    } catch (err) {
      console.error('Error sending removal email:', err);
    }

    // Delete exclusion
    await db
      .delete(exclusions)
      .where(
        and(
          eq(exclusions.familyId, familyId),
          eq(exclusions.memberAId, minId),
          eq(exclusions.memberBId, maxId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove exclusion error:', error);
    return NextResponse.json(
      { error: 'Failed to remove exclusion' },
      { status: 500 }
    );
  }
}
