import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXCLUDE,
  matchesAnyPattern,
  normalizeDiscoveryPath,
  shouldSkipKnownDirectory,
} from '../../../src/core/discovery/pathMatching';

describe('pathMatching', () => {
  it('keeps the expected default exclude patterns', () => {
    expect(DEFAULT_EXCLUDE).toEqual([
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/.codegraphy/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/*.map',
    ]);
  });

  it('normalizes windows path separators', () => {
    expect(normalizeDiscoveryPath('src\\nested\\file.ts')).toBe('src/nested/file.ts');
  });

  it('matches nested files when using basename patterns', () => {
    expect(matchesAnyPattern('src/app.ts', ['*.ts'])).toBe(true);
  });

  it('matches hidden files when dot matching is enabled', () => {
    expect(matchesAnyPattern('config/.env', ['*.env'])).toBe(true);
  });

  it('matches windows-style paths against forward-slash patterns', () => {
    expect(matchesAnyPattern('src\\app.ts', ['src/*.ts'])).toBe(true);
  });

  it('skips exact node_modules and git directories', () => {
    expect(shouldSkipKnownDirectory('node_modules')).toBe(true);
    expect(shouldSkipKnownDirectory('.git')).toBe(true);
  });

  it('skips nested node_modules and git directories', () => {
    expect(shouldSkipKnownDirectory('packages/demo/node_modules')).toBe(false);
    expect(shouldSkipKnownDirectory('node_modules/react')).toBe(true);
    expect(shouldSkipKnownDirectory('.git/objects')).toBe(true);
  });

  it('does not skip similarly named directories', () => {
    expect(shouldSkipKnownDirectory('.github')).toBe(false);
    expect(shouldSkipKnownDirectory('node_modules_cache')).toBe(false);
  });
});
