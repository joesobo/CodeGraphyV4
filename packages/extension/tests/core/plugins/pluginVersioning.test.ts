import { describe, expect, it } from 'vitest';
import { compareSemver, parseSemver, satisfiesSemverRange } from '@/core/plugins/pluginVersioning';

describe('pluginVersioning', () => {
  describe('parseSemver', () => {
    it('parses trimmed multi-digit versions', () => {
      expect(parseSemver(' 12.34.56 ')).toEqual({
        major: 12,
        minor: 34,
        patch: 56,
      });
    });

    it('rejects values with a prefix', () => {
      expect(parseSemver('v12.34.56')).toBeUndefined();
    });

    it('rejects values with a suffix', () => {
      expect(parseSemver('12.34.56-beta')).toBeUndefined();
    });
  });

  describe('compareSemver', () => {
    it('compares major versions before minor and patch', () => {
      expect(compareSemver({ major: 3, minor: 0, patch: 0 }, { major: 2, minor: 99, patch: 99 })).toBeGreaterThan(0);
    });

    it('compares minor versions when majors match', () => {
      expect(compareSemver({ major: 2, minor: 5, patch: 0 }, { major: 2, minor: 4, patch: 99 })).toBeGreaterThan(0);
    });

    it('compares patch versions when major and minor match', () => {
      expect(compareSemver({ major: 2, minor: 4, patch: 5 }, { major: 2, minor: 4, patch: 4 })).toBeGreaterThan(0);
    });
  });

  describe('satisfiesSemverRange', () => {
    it('matches exact versions only', () => {
      expect(satisfiesSemverRange('2.0.0', '2.0.0')).toBe(true);
      expect(satisfiesSemverRange('2.0.1', '2.0.0')).toBe(false);
    });

    it('supports trimmed caret ranges within the same major version', () => {
      expect(satisfiesSemverRange('2.3.4', ' ^2.0.0 ')).toBe(true);
      expect(satisfiesSemverRange('3.0.0', '^2.0.0')).toBe(false);
    });

    it('rejects malformed versions and ranges', () => {
      expect(satisfiesSemverRange('2.0', '^2.0.0')).toBe(false);
      expect(satisfiesSemverRange('2.0.0', 'latest')).toBe(false);
    });
  });
});
