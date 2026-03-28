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

  describe('config thresholds from config', () => {
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

  describe('empty relative path handling', () => {
    it('returns 0 when relative path is empty string', () => {
      // When directory and root are the same
      expect(directoryDepth('/root', '/root')).toBe(0);
      expect(directoryDepth('/home', '/home')).toBe(0);
    });

    it('returns 0 when relative path is dot', () => {
      // This can occur with certain path normalization scenarios
      expect(directoryDepth('/root/.', '/root')).toBe(0);
    });

    it('returns 0 for identical absolute and relative paths', () => {
      expect(directoryDepth('/usr/local', '/usr/local')).toBe(0);
    });
  });

  describe('split and segment filtering', () => {
    it('filters out empty segments from split', () => {
      // Path with trailing separator should be handled correctly
      expect(directoryDepth('/root/src/', '/root')).toBe(1);
    });

    it('counts only non-empty segments', () => {
      expect(directoryDepth('/root/a/b/c', '/root')).toBe(3);
      expect(directoryDepth('/root/a//b/c', '/root')).toBe(3);
    });

    it('handles single-segment paths', () => {
      expect(directoryDepth('/root/single', '/root')).toBe(1);
    });

    it('handles multi-segment paths correctly', () => {
      expect(directoryDepth('/root/a/b/c/d', '/root')).toBe(4);
      expect(directoryDepth('/root/a/b/c/d/e/f', '/root')).toBe(6);
    });
  });

  describe('edge cases for depth calculation', () => {
    it('returns 0 for empty string inputs resolved to same path', () => {
      // relative('', '') would return ''
      expect(directoryDepth('root', 'root')).toBe(0);
    });

    it('returns positive depth for nested relative paths', () => {
      expect(directoryDepth('src/modules/auth', 'src')).toBe(2);
    });

    it('handles path with many segments correctly', () => {
      expect(directoryDepth('/a/b/c/d/e/f/g/h/i', '/a')).toBe(8);
    });
  });

  describe('mutation killers for directoryDepth.ts', () => {
    it('returns 0 when the relative path is empty', () => {
      expect(directoryDepth('/root', '/root')).toBe(0);
    });

    it('returns 0 when the relative path is dot', () => {
      expect(directoryDepth('/root/.', '/root')).toBe(0);
    });

    it('treats empty and dot relative paths as distinct zero-depth cases', () => {
      expect(directoryDepth('/path', '/path')).toBe(0);
      expect(directoryDepth('/path/.', '/path')).toBe(0);
    });

    it('counts path segments after splitting the normalized relative path', () => {
      const depth = directoryDepth('/root/a/b/c', '/root');
      expect(depth).toBe(3);
    });

    it('counts deeper normalized paths exactly', () => {
      expect(directoryDepth('/root/very/deep/path', '/root')).toBe(3);
      expect(directoryDepth('/root/a', '/root')).toBe(1);
    });

    it('counts all normalized segments in long paths', () => {
      expect(directoryDepth('/a/b/c/d/e', '/a')).toBe(4);
    });

    it('kills L21 mutation: empty string relativePath must return 0', () => {
      // When relative path is completely empty (same directories)
      expect(directoryDepth('/identical', '/identical')).toBe(0);
      expect(directoryDepth('/', '/')).toBe(0);
    });

    it('kills L21 mutation: dot (.) relativePath must return 0', () => {
      // The '.' case represents current directory, should be 0 depth
      expect(directoryDepth('/home/.', '/home')).toBe(0);
      expect(directoryDepth('/usr/local/.', '/usr/local')).toBe(0);
    });

    it('counts normalized paths with repeated or trailing separators exactly', () => {
      expect(directoryDepth('/root/a//b/c', '/root')).toBe(3);
      expect(directoryDepth('/root/a/b/', '/root')).toBe(2);
    });
  });
});
