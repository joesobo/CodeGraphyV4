import { describe, expect, it } from 'vitest';
import { stripExtension } from '../../src/organize/stripExtension';

describe('stripExtension', () => {
  describe('compound extensions', () => {
    it('strips .test.ts', () => {
      expect(stripExtension('file.test.ts')).toBe('file');
    });

    it('strips .test.tsx', () => {
      expect(stripExtension('Component.test.tsx')).toBe('Component');
    });

    it('strips .spec.ts', () => {
      expect(stripExtension('utils.spec.ts')).toBe('utils');
    });

    it('strips .spec.tsx', () => {
      expect(stripExtension('Button.spec.tsx')).toBe('Button');
    });
  });

  describe('single extensions', () => {
    it('strips .ts', () => {
      expect(stripExtension('index.ts')).toBe('index');
    });

    it('strips .tsx', () => {
      expect(stripExtension('Component.tsx')).toBe('Component');
    });

    it('strips .js', () => {
      expect(stripExtension('script.js')).toBe('script');
    });

    it('strips .jsx', () => {
      expect(stripExtension('Component.jsx')).toBe('Component');
    });
  });

  describe('compound extensions take precedence', () => {
    it('strips .test.ts before .ts', () => {
      expect(stripExtension('file.test.ts')).toBe('file');
      expect(stripExtension('file.ts')).toBe('file');
    });

    it('correctly identifies compound vs single extension', () => {
      // Even if file ends with .ts, .test.ts is checked first
      const result = stripExtension('utils.test.ts');
      expect(result).toBe('utils');
      expect(result).not.toBe('utils.test');
    });
  });

  describe('files without extensions', () => {
    it('returns unchanged name for no extension', () => {
      expect(stripExtension('Makefile')).toBe('Makefile');
      expect(stripExtension('README')).toBe('README');
    });

    it('handles dot-named files correctly', () => {
      expect(stripExtension('.gitignore')).toBe('.gitignore');
      expect(stripExtension('.env')).toBe('.env');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(stripExtension('')).toBe('');
    });

    it('handles extension only', () => {
      // Extensions at position 0 (no filename) are fully stripped
      expect(stripExtension('.ts')).toBe('');
      expect(stripExtension('.test.ts')).toBe('');
    });

    it('handles multiple dots', () => {
      expect(stripExtension('config.service.ts')).toBe('config.service');
    });

    it('handles trailing dot', () => {
      // Single dot at end is NOT stripped if not a known extension
      expect(stripExtension('file.')).toBe('file.');
    });

    it('preserves case for non-extension parts', () => {
      // Case is preserved in filename, but single extensions are matched case-sensitively
      expect(stripExtension('MyFile.ts')).toBe('MyFile');
    });
  });

  describe('real-world examples', () => {
    it('strips extensions from common filenames', () => {
      expect(stripExtension('index.ts')).toBe('index');
      expect(stripExtension('setupTests.ts')).toBe('setupTests');
      expect(stripExtension('Button.tsx')).toBe('Button');
    });

    it('handles test file patterns', () => {
      expect(stripExtension('Button.test.tsx')).toBe('Button');
      expect(stripExtension('utils.spec.ts')).toBe('utils');
    });
  });
});
