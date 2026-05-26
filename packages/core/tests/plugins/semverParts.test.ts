import { describe, expect, it } from 'vitest';
import { compareSemver, parseSemver } from '../../src/plugins/semverParts';

describe('plugins/semverParts', () => {
  it('parses exact major minor patch versions and rejects non-exact versions', () => {
    expect(parseSemver('  2.10.3  ')).toEqual({ major: 2, minor: 10, patch: 3 });
    expect(parseSemver('12.10.34')).toEqual({ major: 12, minor: 10, patch: 34 });
    expect(parseSemver('2.10')).toBeUndefined();
    expect(parseSemver('^2.10.3')).toBeUndefined();
    expect(parseSemver('2.10.3-beta')).toBeUndefined();
  });

  it('compares versions by major, then minor, then patch', () => {
    expect(compareSemver({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 9, patch: 9 })).toBeGreaterThan(0);
    expect(compareSemver({ major: 1, minor: 9, patch: 9 }, { major: 2, minor: 0, patch: 0 })).toBeLessThan(0);
    expect(compareSemver({ major: 2, minor: 1, patch: 0 }, { major: 2, minor: 3, patch: 0 })).toBeLessThan(0);
    expect(compareSemver({ major: 2, minor: 1, patch: 5 }, { major: 2, minor: 1, patch: 3 })).toBeGreaterThan(0);
    expect(compareSemver({ major: 2, minor: 1, patch: 5 }, { major: 2, minor: 1, patch: 5 })).toBe(0);
  });
});
