import { NextRequest, NextResponse } from 'next/server';
import { requireHost, requireMember, requireStatus } from '@/lib/auth/guards';
import { db, exclusions, memberships, families } from '@/lib/db';
import { eq, and, or } from 'drizzle-orm';
import { addHostExclusionSchema, removeHostExclusionSchema } from '@/lib/validation/schemas';
import { sendEmail } from '@/lib/email/send';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ familyId: string }> }
) {
  const params = await props.params;
  const familyId = parseInt(params.familyId);

  try {
    const { session, family } = await requireHost(familyId);
    await requireStatus(familyId, 'open');

    const body = await request.json();
    const validation = addHostExclusionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { targetMembershipIdA, targetMembershipIdB } = validation.data;

    // Verify targets are in same family
    const targetMemberA = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.id, targetMembershipIdA),
        eq(memberships.familyId, familyId)
      ),
      with: { user: true },
    });

    const targetMemberB = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.id, targetMembershipIdB),
        eq(memberships.familyId, familyId)
      ),
      with: { user: true },
    });

    if (!targetMemberA || !targetMemberB) {
      return NextResponse.json(
        { error: 'One or both target members not found' },
        { status: 404 }
      );
    }

    // Create symmetric pair (smaller ID first)
    const minId = Math.min(targetMembershipIdA, targetMembershipIdB);
    const maxId = Math.max(targetMembershipIdA, targetMembershipIdB);

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

    // Create exclusion
    const result = await db
      .insert(exclusions)
      .values({
        familyId,
        memberAId: minId,
        memberBId: maxId,
        createdByMembershipId: family.hostUserId,
      })
      .returning();

    // Send emails to both parties
    const emailTextA = `The family host has set an exclusion so you and ${targetMemberB.displayName} won't be matched in the ${family?.name} Secret Santa.`;
    const emailTextB = `The family host has set an exclusion so you and ${targetMemberA.displayName} won't be matched in the ${family?.name} Secret Santa.`;
    const emailHtmlA = `<p><strong>The family host</strong> has set an exclusion so you and <strong>${targetMemberB.displayName}</strong> won't be matched in the <strong>${family?.name}</strong> Secret Santa.</p>`;
    const emailHtmlB = `<p><strong>The family host</strong> has set an exclusion so you and <strong>${targetMemberA.displayName}</strong> won't be matched in the <strong>${family?.name}</strong> Secret Santa.</p>`;

    try {
      const sendA = sendEmail({
        to: targetMemberA.user.email,
        subject: `Exclusion set in ${family?.name}`,
        text: emailTextA,
        html: emailHtmlA,
      });

       const sendB = sendEmail({
        to: targetMemberB.user.email,
        subject: `Exclusion set in ${family?.name}`,
        text: emailTextB,
        html: emailHtmlB,
      });

      await Promise.all([sendA, sendB]);
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
    const { session, family } = await requireHost(familyId);
    await requireStatus(familyId, 'open');

    const body = await request.json();
    const validation = removeHostExclusionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { targetMembershipIdA, targetMembershipIdB } = validation.data;

    const minId = Math.min(targetMembershipIdA, targetMembershipIdB);
    const maxId = Math.max(targetMembershipIdA, targetMembershipIdB);

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
    const targetMemberA = await db.query.memberships.findFirst({
      where: eq(memberships.id, targetMembershipIdA),
      with: { user: true },
    });

    const targetMemberB = await db.query.memberships.findFirst({
      where: eq(memberships.id, targetMembershipIdB),
      with: { user: true },
    });

    const host = await db.query.memberships.findFirst({
      where: eq(memberships.id, family.hostUserId),
    });

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

    // Send emails to both parties
    const emailTextA = `${host?.displayName} has removed an exclusion. You and ${targetMemberB?.displayName} can now be matched in the ${family?.name} Secret Santa.`;
    const emailHtmlA = `<p><strong>${host?.displayName}</strong> has removed an exclusion. You and <strong>${targetMemberB?.displayName}</strong> can now be matched in the <strong>${family?.name}</strong> Secret Santa.</p>`;

    const emailTextB = `${host?.displayName} has removed an exclusion. You and ${targetMemberA?.displayName} can now be matched in the ${family?.name} Secret Santa.`;
    const emailHtmlB = `<p><strong>${host?.displayName}</strong> has removed an exclusion. You and <strong>${targetMemberA?.displayName}</strong> can now be matched in the <strong>${family?.name}</strong> Secret Santa.</p>`;

    try {
      const sendA = sendEmail({
        to: targetMemberA?.user.email || '',
        subject: `Exclusion removed in ${family?.name}`,
        text: emailTextA,
        html: emailHtmlA,
      });

      const sendB = sendEmail({
        to: targetMemberB?.user.email || '',
        subject: `Exclusion removed in ${family?.name}`,
        text: emailTextB,
        html: emailHtmlB,
      });

      await Promise.all([sendA, sendB]);
    } catch (err) {
      console.error('Error sending removal email:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove exclusion error:', error);
    return NextResponse.json(
      { error: 'Failed to remove exclusion' },
      { status: 500 }
    );
  }
}
