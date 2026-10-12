import crypto from 'crypto';

export interface PersonWithId {
  id: number;
}

export interface AssignmentInput {
  participants: PersonWithId[];
  exclusions: Set<string>; // canonical pairs as "min-max"
}

export interface AssignmentResult {
  giver: number;
  receiver: number;
}

export class DerangementError extends Error {
  constrainedPeople: number[] = [];

  constructor(message: string, constrainedPeople: number[] = []) {
    super(message);
    this.constrainedPeople = constrainedPeople;
    this.name = 'DerangementError';
  }
}

function canonicalPair(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function isExcluded(
  giver: number,
  receiver: number,
  exclusions: Set<string>
): boolean {
  if (giver === receiver) return true;
  return exclusions.has(canonicalPair(giver, receiver));
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.randomUUID().charCodeAt(0) % (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateDerangement(input: AssignmentInput): AssignmentResult[] {
  const { participants, exclusions } = input;
  const n = participants.length;

  if (n < 3) {
    throw new Error('Need at least 3 participants for Secret Santa');
  }

  const maxRetries = 1000;
  const ids = participants.map((p) => p.id);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const shuffled = shuffleArray(ids);
    const assignment: AssignmentResult[] = [];
    let valid = true;

    for (let i = 0; i < n; i++) {
      const giver = ids[i];
      const receiver = shuffled[i];

      if (isExcluded(giver, receiver, exclusions)) {
        valid = false;
        break;
      }

      assignment.push({ giver, receiver });
    }

    if (valid) {
      return assignment;
    }
  }

  // Find most constrained people for error message
  const constraintCounts: Map<number, number> = new Map();
  for (const id of ids) {
    let count = 0;
    for (const otherId of ids) {
      if (isExcluded(id, otherId, exclusions)) {
        count++;
      }
    }
    constraintCounts.set(id, count);
  }

  const sorted = Array.from(constraintCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e) => e[0]);

  throw new DerangementError(
    'Could not find a valid Secret Santa assignment with the current exclusions. ' +
    'Try removing some exclusions.',
    sorted
  );
}
