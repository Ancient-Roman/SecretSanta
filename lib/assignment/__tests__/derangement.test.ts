import { describe, it, expect } from 'vitest';
import { generateDerangement, DerangementError } from '@/lib/assignment/derangement';

describe('Derangement Algorithm', () => {
  it('should create a valid derangement for 3 people', () => {
    const participants = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const exclusions = new Set<string>();

    const result = generateDerangement({ participants, exclusions });

    // Check no one draws themselves
    for (const assignment of result) {
      expect(assignment.giver).not.toBe(assignment.receiver);
    }

    // Check all receivers are covered
    const receivers = result.map((a) => a.receiver);
    expect(receivers.sort()).toEqual([1, 2, 3]);
  });

  it('should respect exclusions', () => {
    const participants = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const exclusions = new Set(['1-2']);

    const result = generateDerangement({ participants, exclusions });

    for (const assignment of result) {
      const pair =
        assignment.giver < assignment.receiver
          ? `${assignment.giver}-${assignment.receiver}`
          : `${assignment.receiver}-${assignment.giver}`;
      expect(exclusions.has(pair)).toBe(false);
      expect(assignment.giver).not.toBe(assignment.receiver);
    }
  });

  it('should handle complex exclusions', () => {
    const participants = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
    ];
    const exclusions = new Set(['1-2', '2-3', '3-4']);

    const result = generateDerangement({ participants, exclusions });

    // Verify no invalid pairs
    for (const assignment of result) {
      const pair =
        assignment.giver < assignment.receiver
          ? `${assignment.giver}-${assignment.receiver}`
          : `${assignment.receiver}-${assignment.giver}`;
      expect(exclusions.has(pair)).toBe(false);
      expect(assignment.giver).not.toBe(assignment.receiver);
    }
  });

  it('should throw when impossible', () => {
    const participants = [{ id: 1 }, { id: 2 }];
    const exclusions = new Set(['1-2']);

    expect(() => {
      generateDerangement({ participants, exclusions });
    }).toThrow(DerangementError);
  });

  it('should handle 5+ participants with multiple exclusions', () => {
    const participants = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const exclusions = new Set([
      '1-2',
      '3-4',
      '5-6',
      '7-8',
      '2-5',
      '6-9',
    ]);

    const result = generateDerangement({ participants, exclusions });

    expect(result.length).toBe(10);
    const receivers = result.map((a) => a.receiver).sort((a, b) => a - b);
    expect(receivers).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
  });
});
