import { describe, expect, it } from 'vitest';
import { getFileExtension, normalizePluginExtension } from '@/core/plugins/routing/fileExtensions';

describe('fileExtensions', () => {
  describe('normalizePluginExtension', () => {
    it('adds a leading dot when missing', () => {
      expect(normalizePluginExtension('ts')).toBe('.ts');
    });

    it('preserves an existing leading dot', () => {
      expect(normalizePluginExtension('.ts')).toBe('.ts');
    });
  });

  describe('getFileExtension', () => {
    it('returns the normalized lowercase extension for files with an extension', () => {
      expect(getFileExtension('/workspace/Component.TS')).toBe('.ts');
    });

    it('returns an empty string for files without an extension', () => {
      expect(getFileExtension('/workspace/Makefile')).toBe('');
    });

    it('returns an empty string for files ending with a dot', () => {
      expect(getFileExtension('/workspace/app.')).toBe('');
    });
  });
});
