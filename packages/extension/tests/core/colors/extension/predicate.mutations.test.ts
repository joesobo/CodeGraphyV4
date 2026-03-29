import { describe, expect, it } from 'vitest';
import { isExtension } from '../../../../src/core/colors/extension/predicate';

describe('isExtension guard mutants', () => {
  it('returns false for wildcard-only dot-prefixed patterns', () => {
    expect(isExtension('.*')).toBe(false);
    expect(isExtension('.*x')).toBe(false);
  });

  it('returns false for dot-prefixed patterns containing forward slashes', () => {
    expect(isExtension('.a/b')).toBe(false);
    expect(isExtension('.t/s')).toBe(false);
  });

  it('returns false for dot-prefixed patterns containing backslashes', () => {
    expect(isExtension('.a\\b')).toBe(false);
    expect(isExtension('.t\\s')).toBe(false);
  });

  it('returns false for slash and backslash sentinels', () => {
    expect(isExtension('/')).toBe(false);
    expect(isExtension('\\')).toBe(false);
  });

  it('returns false instead of undefined when guard clauses match', () => {
    const wildcard = isExtension('.*x');
    const slash = isExtension('.a/b');
    const backslash = isExtension('.a\\b');

    expect(wildcard).toBe(false);
    expect(slash).toBe(false);
    expect(backslash).toBe(false);
    expect(wildcard).not.toBeUndefined();
    expect(slash).not.toBeUndefined();
    expect(backslash).not.toBeUndefined();
  });
});
