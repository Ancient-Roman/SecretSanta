import { NextRequest, NextResponse } from 'next/server';
import { requireHost, requireStatus } from '@/lib/auth/guards';
import { db, families, memberships, assignments, exclusions } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { generateDerangement, DerangementError } from '@/lib/assignment/derangement';
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

    // Get participants
    const participants = await db.query.memberships.findMany({
      where: and(
        eq(memberships.familyId, familyId),
        eq(memberships.isParticipant, true)
      ),
      with: { user: true },
    });

    if (participants.length < 3) {
      return NextResponse.json(
        { error: 'Need at least 3 participants to draw names' },
        { status: 400 }
      );
    }

    // Get exclusions
    const exclusionRecords = await db.query.exclusions.findMany({
      where: eq(exclusions.familyId, familyId),
    });

    const exclusionSet = new Set<string>();
    for (const ex of exclusionRecords) {
      const pair = ex.memberAId < ex.memberBId
        ? `${ex.memberAId}-${ex.memberBId}`
        : `${ex.memberBId}-${ex.memberAId}`;
      exclusionSet.add(pair);
    }

    // Generate derangement
    let assignmentResults;
    try {
      assignmentResults = generateDerangement({
        participants: participants.map((p) => ({ id: p.id })),
        exclusions: exclusionSet,
      });
    } catch (error) {
      if (error instanceof DerangementError) {
        return NextResponse.json(
          {
            error: error.message,
            constrainedPeople: error.constrainedPeople,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Store assignments in DB
    const insertValues = assignmentResults.map((a) => ({
      familyId,
      giverMembershipId: a.giver,
      receiverMembershipId: a.receiver,
    }));

    await db.insert(assignments).values(insertValues);

    // Update family status to locked
    await db
      .update(families)
      .set({
        status: 'locked',
        updatedAt: new Date(),
      })
      .where(eq(families.id, familyId));

    // Send assignment emails
    const memberMap = new Map(participants.map((p) => [p.id, p]));

    for (const assignment of assignmentResults) {
      const giver = memberMap.get(assignment.giver);
      const receiver = memberMap.get(assignment.receiver);

      if (!giver || !receiver) continue;

      const budget = family.budget ? `$${family.budget}` : 'no budget limit';
      const exchangeDate = family.exchangeDate
        ? new Date(family.exchangeDate).toLocaleDateString()
        : 'TBD';

      const text = `You are the Secret Santa for ${receiver.displayName} in the ${family.name} Secret Santa! Budget: ${budget}. Exchange date: ${exchangeDate}. View their wishlist to get ideas.`;
      const html = `
        <p>You are the Secret Santa for <strong>${receiver.displayName}</strong> in the <strong>${family.name}</strong> Secret Santa!</p>
        <p><strong>Budget:</strong> ${budget}</p>
        <p><strong>Exchange Date:</strong> ${exchangeDate}</p>
        <p>View their wishlist at: <a href="${process.env.APP_URL}/f/${familyId}">${process.env.APP_URL}/f/${familyId}</a></p>
      `;

      try {
        await sendEmail({
          to: giver.user.email,
          subject: `Your Secret Santa Assignment - ${family.name}`,
          text,
          html,
        });

        // Mark email as sent
        await db
          .update(assignments)
          .set({ emailSentAt: new Date() })
          .where(
            and(
              eq(assignments.familyId, familyId),
              eq(assignments.giverMembershipId, assignment.giver),
              eq(assignments.receiverMembershipId, assignment.receiver)
            )
          );
      } catch (emailError) {
        console.error('Error sending assignment email:', emailError);

        // Record error for retry
        await db
          .update(assignments)
          .set({
            emailError: (emailError as Error).message,
          })
          .where(
            and(
              eq(assignments.familyId, familyId),
              eq(assignments.giverMembershipId, assignment.giver),
              eq(assignments.receiverMembershipId, assignment.receiver)
            )
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Draw error:', error);
    return NextResponse.json(
      { error: 'Failed to draw names' },
      { status: 500 }
    );
  }
}
