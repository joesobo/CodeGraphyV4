import { describe, expect, it } from 'vitest';
import { compareSemver, parseSemver } from '../../../../../src/core/plugins/versioning/semver/value';

describe('core/plugins/versioning/semver', () => {
  it('parses exact semver strings and trims whitespace', () => {
    expect(parseSemver(' 12.34.56 ')).toEqual({
      major: 12,
      minor: 34,
      patch: 56,
    });
  });

  it('rejects partial semver matches and non-numeric segments', () => {
    expect(parseSemver('1.2.3-beta')).toBeUndefined();
    expect(parseSemver('v1.2.3')).toBeUndefined();
    expect(parseSemver('1.2')).toBeUndefined();
  });

  it('compares patch versions after major and minor match', () => {
    expect(compareSemver(
      { major: 1, minor: 2, patch: 3 },
      { major: 1, minor: 2, patch: 5 },
    )).toBe(-2);
    expect(compareSemver(
      { major: 1, minor: 2, patch: 5 },
      { major: 1, minor: 2, patch: 3 },
    )).toBe(2);
  });

  it('compares major versions before looking at minor or patch values', () => {
    expect(compareSemver(
      { major: 3, minor: 0, patch: 0 },
      { major: 1, minor: 99, patch: 99 },
    )).toBe(2);
  });

  it('compares minor versions when majors match', () => {
    expect(compareSemver(
      { major: 1, minor: 4, patch: 0 },
      { major: 1, minor: 2, patch: 99 },
    )).toBe(2);
  });
});
