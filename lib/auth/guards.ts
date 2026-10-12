import { getSession } from './session';
import { db, families, memberships } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError('Not authenticated');
  }
  return session;
}

export async function requireHostAuth() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError('Not authenticated');
  }
  if (!session.isHost) {
    throw new UnauthorizedError('Host access required');
  }
  return session;
}

export async function requireMember(familyId: number) {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError('Not authenticated');
  }

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.familyId, familyId),
      eq(memberships.userId, session.userId)
    ),
  });

  if (!membership) {
    throw new UnauthorizedError('Not a member of this family');
  }

  return { session, membership };
}

export async function requireHost(familyId: number) {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError('Not authenticated');
  }

  const family = await db.query.families.findFirst({
    where: eq(families.id, familyId),
  });

  if (!family) {
    throw new Error('Family not found');
  }

  if (family.hostUserId !== session.userId) {
    throw new UnauthorizedError('Host access required for this family');
  }

  return { session, family };
}

export async function requireStatus(
  familyId: number,
  ...allowedStatuses: Array<'open' | 'locked' | 'day_of' | 'completed'>
) {
  const family = await db.query.families.findFirst({
    where: eq(families.id, familyId),
  });

  if (!family) {
    throw new Error('Family not found');
  }

  if (!allowedStatuses.includes(family.status)) {
    throw new Error(
      `Family must be in one of these statuses: ${allowedStatuses.join(', ')}`
    );
  }

  return family;
}
