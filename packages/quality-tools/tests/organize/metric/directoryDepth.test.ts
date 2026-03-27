import { describe, expect, it } from 'vitest';
import { directoryDepth, depthVerdict } from '../../../src/organize/metric/directoryDepth';

describe('directoryDepth', () => {
  describe('depth calculation', () => {
    it('returns 0 for the root directory itself', () => {
      expect(directoryDepth('/root', '/root')).toBe(0);
      expect(directoryDepth('/home/user', '/home/user')).toBe(0);
    });

    it('returns 1 for a directory one level deep', () => {
      expect(directoryDepth('/root/src', '/root')).toBe(1);
      expect(directoryDepth('/home/user/documents', '/home/user')).toBe(1);
    });

    it('returns correct depth for deeply nested directories', () => {
      expect(directoryDepth('/root/src/lib/utils', '/root')).toBe(3);
      expect(directoryDepth('/home/user/projects/app/src/pages', '/home/user')).toBe(4);
    });

    it('counts segments correctly for two-level nesting', () => {
      expect(directoryDepth('/root/src/lib', '/root')).toBe(2);
    });
  });

  describe('path normalization', () => {
    it('handles relative paths', () => {
      // relative('src/pages', 'src') -> 'pages'
      // depth = 1
      expect(directoryDepth('src/pages', 'src')).toBe(1);
    });

    it('handles paths with dots', () => {
      expect(directoryDepth('/root/./src', '/root')).toBe(1);
    });
  });

  describe('complex paths', () => {
    it('handles multiple path separators correctly', () => {
      expect(directoryDepth('/a/b/c/d/e', '/a')).toBe(4);
    });

    it('counts intermediate directories', () => {
      expect(directoryDepth('/root/a/b/c', '/root')).toBe(3);
    });
  });

  describe('windows-style paths', () => {
    it('handles backslash-separated paths on Windows (when running on Windows)', () => {
      // This test is platform-specific - it only applies when running on Windows
      // where path.sep is '\\'
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const isWindows = require('path').sep === '\\';
      if (isWindows) {
        expect(directoryDepth('C:\\Users\\User\\Documents', 'C:\\Users\\User')).toBe(1);
        expect(directoryDepth('C:\\Users\\User\\Documents\\Work', 'C:\\Users\\User')).toBe(2);
      }
      // On non-Windows systems, just verify the function works with forward slashes
      expect(directoryDepth('/home/user/documents', '/home/user')).toBe(1);
    });
  });
});

describe('depthVerdict', () => {
  describe('stable verdict', () => {
    it('returns STABLE when depth is below warning threshold', () => {
      expect(depthVerdict(0, 4, 5)).toBe('STABLE');
      expect(depthVerdict(3, 4, 5)).toBe('STABLE');
    });

    it('returns STABLE at depth 0', () => {
      expect(depthVerdict(0, 2, 3)).toBe('STABLE');
    });
  });

  describe('warning verdict', () => {
    it('returns WARNING when depth is at or above warning threshold but below deep threshold', () => {
      expect(depthVerdict(4, 4, 5)).toBe('WARNING');
      expect(depthVerdict(4, 4, 6)).toBe('WARNING');
    });

    it('returns WARNING between thresholds', () => {
      expect(depthVerdict(2, 2, 3)).toBe('WARNING');
      expect(depthVerdict(3, 2, 4)).toBe('WARNING');
    });
  });

  describe('deep verdict', () => {
    it('returns DEEP when depth is at or above deep threshold', () => {
      expect(depthVerdict(5, 4, 5)).toBe('DEEP');
      expect(depthVerdict(6, 4, 5)).toBe('DEEP');
      expect(depthVerdict(10, 4, 5)).toBe('DEEP');
    });
  });

  describe('boundary conditions', () => {
    it('handles equal warning and deep thresholds', () => {
      expect(depthVerdict(2, 3, 3)).toBe('STABLE');
      expect(depthVerdict(3, 3, 3)).toBe('DEEP');
    });

    it('handles high thresholds', () => {
      expect(depthVerdict(5, 10, 20)).toBe('STABLE');
      expect(depthVerdict(10, 10, 20)).toBe('WARNING');
      expect(depthVerdict(20, 10, 20)).toBe('DEEP');
    });

    it('handles low thresholds', () => {
      expect(depthVerdict(0, 1, 2)).toBe('STABLE');
      expect(depthVerdict(1, 1, 2)).toBe('WARNING');
      expect(depthVerdict(2, 1, 2)).toBe('DEEP');
    });
  });

  describe('config thresholds from organizeConfig', () => {
    // Based on default config: { warning: 4, deep: 5 }
    it('applies default config thresholds', () => {
      expect(depthVerdict(3, 4, 5)).toBe('STABLE');
      expect(depthVerdict(4, 4, 5)).toBe('WARNING');
      expect(depthVerdict(5, 4, 5)).toBe('DEEP');
      expect(depthVerdict(6, 4, 5)).toBe('DEEP');
    });
  });

  describe('real-world depth scenarios', () => {
    it('evaluates typical source code depths', () => {
      // src/utils -> depth 1 -> STABLE
      expect(depthVerdict(1, 4, 5)).toBe('STABLE');

      // src/modules/auth/providers -> depth 3 -> STABLE
      expect(depthVerdict(3, 4, 5)).toBe('STABLE');

      // src/modules/auth/providers/strategies/oauth -> depth 4 -> WARNING
      expect(depthVerdict(4, 4, 5)).toBe('WARNING');

      // src/modules/auth/providers/strategies/oauth/google -> depth 5 -> DEEP
      expect(depthVerdict(5, 4, 5)).toBe('DEEP');
    });
  });
});
