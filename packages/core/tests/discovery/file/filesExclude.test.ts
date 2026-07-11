import { describe, expect, it } from 'vitest';
import { isFilesExcludedPath } from '../../../src/discovery/file/filesExclude';

describe('discovery/file/filesExclude', () => {
  it('matches workspace-relative file patterns', () => {
    expect(isFilesExcludedPath(
      'src/app.test.ts',
      [{ pattern: '**/*.test.ts' }],
      new Set(['app.test.ts']),
    )).toBe(true);
  });

  it('excludes descendants of a matching directory rule', () => {
    expect(isFilesExcludedPath(
      'src/generated/client.ts',
      [{ pattern: '**/generated' }],
      new Set(['client.ts']),
    )).toBe(true);
  });

  it('does not implicitly match an unprefixed root rule in nested folders', () => {
    expect(isFilesExcludedPath(
      'src/generated/client.ts',
      [{ pattern: 'generated' }],
      new Set(['client.ts']),
    )).toBe(false);
  });

  it('applies a conditional rule when the derived sibling exists', () => {
    expect(isFilesExcludedPath(
      'src/app.js',
      [{ pattern: '**/*.js', when: '$(basename).ts' }],
      new Set(['app.js', 'app.ts']),
    )).toBe(true);
  });

  it('keeps a conditional match when the derived sibling is absent', () => {
    expect(isFilesExcludedPath(
      'src/app.js',
      [{ pattern: '**/*.js', when: '$(basename).ts' }],
      new Set(['app.js']),
    )).toBe(false);
  });

  it('normalizes Windows separators before matching', () => {
    expect(isFilesExcludedPath(
      'src\\generated\\client.ts',
      [{ pattern: '**/generated' }],
      new Set(['client.ts']),
    )).toBe(true);
  });

  it('treats leading exclamation and hash characters as literal glob text', () => {
    expect(isFilesExcludedPath('!important.ts', [{ pattern: '!important.ts' }], new Set())).toBe(true);
    expect(isFilesExcludedPath('#draft.ts', [{ pattern: '#draft.ts' }], new Set())).toBe(true);
    expect(isFilesExcludedPath('src/app.ts', [{ pattern: '!important.ts' }], new Set())).toBe(false);
  });
});
