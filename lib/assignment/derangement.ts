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
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateDerangement(input: AssignmentInput): AssignmentResult[] {
  const { participants, exclusions } = input;
  const ids = participants.map((p) => p.id);
  const n = ids.length;

  if (n < 3) {
    throw new DerangementError('Need at least 3 participants for Secret Santa', ids);
  }

  const orderedGivers = shuffleArray(ids);
  const usedReceivers = new Set<number>();
  const assignment: AssignmentResult[] = [];

  function backtrack(index: number): boolean {
    if (index === orderedGivers.length) {
      return true;
    }

    const giver = orderedGivers[index];
    const candidates = shuffleArray(
      ids.filter(
        (receiver) =>
          receiver !== giver &&
          !usedReceivers.has(receiver) &&
          !isExcluded(giver, receiver, exclusions)
      )
    );

    for (const receiver of candidates) {
      usedReceivers.add(receiver);
      assignment.push({ giver, receiver });

      if (backtrack(index + 1)) {
        return true;
      }

      assignment.pop();
      usedReceivers.delete(receiver);
    }

    return false;
  }

  if (!backtrack(0)) {
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

  return assignment;
}
