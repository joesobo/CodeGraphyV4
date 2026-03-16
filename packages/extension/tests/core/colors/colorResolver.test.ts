import { describe, it, expect } from 'vitest';
import {
  isExtension,
  normalizeExtension,
  getExtension,
  resolveColor,
  resolveColorInfo,
} from '../../../src/core/colors/colorResolver';
import { DEFAULT_FALLBACK_COLOR } from '../../../src/core/colors/colorPaletteManager';

describe('colorResolver', () => {
  describe('isExtension', () => {
    it('returns true for simple extensions like .ts', () => {
      expect(isExtension('.ts')).toBe(true);
    });

    it('returns true for short extensions like .md', () => {
      expect(isExtension('.md')).toBe(true);
    });

    it('returns false for dotfiles like .gitignore', () => {
      expect(isExtension('.gitignore')).toBe(false);
    });

    it('returns false for glob patterns containing asterisk', () => {
      expect(isExtension('*.test.ts')).toBe(false);
    });

    it('returns false for paths containing slashes', () => {
      expect(isExtension('src/app.ts')).toBe(false);
    });

    it('returns false for plain filenames without a dot', () => {
      expect(isExtension('Makefile')).toBe(false);
    });
  });

  describe('normalizeExtension', () => {
    it('adds a leading dot to extensions without one', () => {
      expect(normalizeExtension('ts')).toBe('.ts');
    });

    it('lowercases extensions', () => {
      expect(normalizeExtension('.TS')).toBe('.ts');
    });

    it('trims whitespace', () => {
      expect(normalizeExtension('  .ts  ')).toBe('.ts');
    });

    it('preserves extensions that already have a leading dot', () => {
      expect(normalizeExtension('.ts')).toBe('.ts');
    });
  });

  describe('getExtension', () => {
    it('returns the extension for a normal file path', () => {
      expect(getExtension('src/app.ts')).toBe('.ts');
    });

    it('returns empty string for dotfiles like .gitignore', () => {
      expect(getExtension('.gitignore')).toBe('');
    });

    it('returns the last extension for multi-part extensions', () => {
      expect(getExtension('app.test.ts')).toBe('.ts');
    });
  });

  describe('resolveColor', () => {
    it('returns user pattern color when the file matches a user pattern', () => {
      const userPatterns = new Map([['**/*.test.ts', '#ff0000']]);

      const result = resolveColor(
        'src/app.test.ts',
        userPatterns,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
      );

      expect(result).toBe('#ff0000');
    });

    it('returns plugin pattern color when no user pattern matches', () => {
      const pluginPatterns = new Map([['Makefile', '#00ff00']]);

      const result = resolveColor(
        'Makefile',
        new Map(),
        pluginPatterns,
        new Map(),
        new Map(),
        new Map(),
      );

      expect(result).toBe('#00ff00');
    });

    it('returns user extension color when no patterns match', () => {
      const userExtensions = new Map([['.ts', '#0000ff']]);

      const result = resolveColor(
        'src/app.ts',
        new Map(),
        new Map(),
        userExtensions,
        new Map(),
        new Map(),
      );

      expect(result).toBe('#0000ff');
    });

    it('returns plugin extension color when no user colors match', () => {
      const pluginExtensions = new Map([['.ts', '#abcdef']]);

      const result = resolveColor(
        'src/app.ts',
        new Map(),
        new Map(),
        new Map(),
        pluginExtensions,
        new Map(),
      );

      expect(result).toBe('#abcdef');
    });

    it('returns generated color when no user or plugin colors match', () => {
      const generated = new Map([['.ts', '#123456']]);

      const result = resolveColor(
        'src/app.ts',
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        generated,
      );

      expect(result).toBe('#123456');
    });

    it('returns the fallback color when nothing matches', () => {
      const result = resolveColor(
        'src/app.ts',
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
      );

      expect(result).toBe(DEFAULT_FALLBACK_COLOR);
    });

    it('prefers user pattern over user extension', () => {
      const userPatterns = new Map([['**/*.ts', '#pattern']]);
      const userExtensions = new Map([['.ts', '#extension']]);

      const result = resolveColor(
        'src/app.ts',
        userPatterns,
        new Map(),
        userExtensions,
        new Map(),
        new Map(),
      );

      expect(result).toBe('#pattern');
    });
  });

  describe('resolveColorInfo', () => {
    it('returns source=user for user pattern matches', () => {
      const userPatterns = new Map([['Makefile', '#ff0000']]);

      const result = resolveColorInfo(
        'Makefile',
        userPatterns,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
      );

      expect(result.source).toBe('user');
      expect(result.color).toBe('#ff0000');
    });

    it('returns source=plugin for plugin pattern matches', () => {
      const pluginPatterns = new Map([['Makefile', '#00ff00']]);

      const result = resolveColorInfo(
        'Makefile',
        new Map(),
        pluginPatterns,
        new Map(),
        new Map(),
        new Map(),
      );

      expect(result.source).toBe('plugin');
    });

    it('returns source=generated for generated colors', () => {
      const generated = new Map([['.ts', '#aabbcc']]);

      const result = resolveColorInfo(
        'src/app.ts',
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        generated,
      );

      expect(result.source).toBe('generated');
    });

    it('returns fallback with source=generated when nothing matches', () => {
      const result = resolveColorInfo(
        'src/app.ts',
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
      );

      expect(result.color).toBe(DEFAULT_FALLBACK_COLOR);
      expect(result.source).toBe('generated');
    });
  });
});
