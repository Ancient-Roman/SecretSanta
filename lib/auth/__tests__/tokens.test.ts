import { describe, it, expect } from 'vitest';
import { generateFamilyCode } from '@/lib/auth/tokens';

describe('Auth Helpers', () => {
  it('should generate a 6-char family code', () => {
    const code = generateFamilyCode();
    expect(code.length).toBe(6);
  });

  it('should only use non-ambiguous characters', () => {
    const ambiguous = '0O1Il';
    for (let i = 0; i < 10; i++) {
      const code = generateFamilyCode();
      for (const char of code) {
        expect(ambiguous).not.toContain(char);
      }
    }
  });

  it('should generate unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateFamilyCode());
    }
    // High probability of no duplicates in 100 iterations
    expect(codes.size).toBeGreaterThan(95);
  });
});
