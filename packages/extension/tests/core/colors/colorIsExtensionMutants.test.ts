// Tests targeting surviving mutants in colorIsExtension.ts.
//
// Surviving mutants:
// - L10:7  ConditionalExpression: false (2x) - the glob/path guard always returns false
// - L10:7  LogicalOperator mutation - || changed to && or similar
// - L10:81 BlockStatement: {} - { return false; } -> {} (falls through)
//
// Line 10: if (pattern.includes('*') || pattern.includes('/') || pattern.includes('\\'))
// Line 11:   return false;
//
// These mutants survive if tests don't verify that patterns with ONLY one special
// character return false. The existing tests use combined patterns that match
// multiple conditions.

import { describe, it, expect } from 'vitest';
import { isExtension } from '../../../src/core/colors/colorIsExtension';

describe('isExtension glob/path guard (L10 mutants)', () => {
  it('returns false for a pattern containing only a wildcard character', () => {
    // Tests the pattern.includes('*') branch independently
    // If ConditionalExpression is mutated to false, this would fall through
    // and potentially return true (since '*' starts with... well, it doesn't start with '.')
    // Actually it would return false at L20 since it doesn't start with '.'.
    // But we need to make sure the guard works.
    expect(isExtension('*')).toBe(false);
  });

  it('returns false for a pattern that is just a wildcard with dot prefix', () => {
    // .* would match the startsWith('.') check and has length > 1
    // afterDot = '*' which has no '.' and length <= 4
    // Without the wildcard guard on L10, this would return TRUE
    // This kills the ConditionalExpression:false mutant
    expect(isExtension('.*')).toBe(false);
  });

  it('returns false for a dot-prefixed pattern containing a forward slash', () => {
    // Without the '/' guard on L10, '.a/b' would reach the startsWith('.') check
    // afterDot = 'a/b' which has no '.' and length <= 4
    // It would return true — but should return false due to the '/' guard
    expect(isExtension('.a/b')).toBe(false);
  });

  it('returns false for a dot-prefixed pattern containing a backslash', () => {
    // Without the '\\' guard on L10, '.a\\b' would reach the startsWith('.') check
    // afterDot = 'a\\b' which has no '.' and length <= 4 (3 chars)
    // It would return true — but should return false due to the '\\' guard
    expect(isExtension('.a\\b')).toBe(false);
  });

  it('returns false for a pattern with only a forward slash', () => {
    // Tests the pattern.includes('/') branch in isolation
    expect(isExtension('/')).toBe(false);
  });

  it('returns false for a pattern with only a backslash', () => {
    // Tests the pattern.includes('\\') branch in isolation
    expect(isExtension('\\')).toBe(false);
  });

  it('returns false for a glob pattern that looks like an extension', () => {
    // This is the key test: *.ts contains '*' and would be a valid
    // extension format without the glob guard
    expect(isExtension('*.ts')).toBe(false);
  });
});

describe('isExtension LogicalOperator mutant (L10)', () => {
  it('returns false when pattern contains wildcard but not slash or backslash', () => {
    // If || is mutated to &&, then all three includes must be true.
    // With only '*', pattern.includes('/') is false, pattern.includes('\\') is false
    // So && would make the guard false, letting the pattern through.
    // '.*' starts with '.', afterDot='*', length 1 <= 4, no dots → would return true
    expect(isExtension('.*')).toBe(false);
  });

  it('returns false when pattern contains slash but not wildcard or backslash', () => {
    // If || is mutated to &&, the '/' alone would not satisfy all three conditions
    // '.t/s' starts with '.', afterDot='t/s' has no '.', length 3 <= 4 → would return true
    // But with the '/' guard, it should return false
    expect(isExtension('.t/s')).toBe(false);
  });

  it('returns false when pattern contains backslash but not wildcard or slash', () => {
    // If || is mutated to &&, the '\\' alone would not satisfy all three conditions
    expect(isExtension('.t\\s')).toBe(false);
  });
});

describe('isExtension BlockStatement mutant (L10:81)', () => {
  it('returns false (not undefined) for a pattern with a glob character', () => {
    // If { return false; } is mutated to {}, the function would NOT return at this point
    // and would fall through to the startsWith('.') check.
    // '.*x' starts with '.', afterDot='*x', no dot in afterDot, length 2 <= 4 → returns true
    // But with the guard, it should explicitly return false.
    const result = isExtension('.*x');
    expect(result).toBe(false);
    expect(result).not.toBeUndefined();
  });
});
