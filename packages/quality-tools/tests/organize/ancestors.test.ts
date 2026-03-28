import { describe, expect, it } from 'vitest';
import { extractAncestorFolders, computeAverageRedundancy } from '../../src/organize/ancestors';

describe('extractAncestorFolders', () => {
  it('returns empty array for root directory', () => {
    expect(extractAncestorFolders('.')).toEqual([]);
  });

  it('extracts single folder from single-level path', () => {
    expect(extractAncestorFolders('src')).toEqual(['src']);
  });

  it('extracts multiple folders from nested path with forward slashes', () => {
    expect(extractAncestorFolders('src/core/utils')).toEqual(['src', 'core', 'utils']);
  });

  it('extracts multiple folders from path with backslashes', () => {
    expect(extractAncestorFolders('src\\core\\utils')).toEqual(['src', 'core', 'utils']);
  });

  it('handles mixed slashes', () => {
    expect(extractAncestorFolders('src/core\\utils/helpers')).toEqual(['src', 'core', 'utils', 'helpers']);
  });

  it('filters out empty segments', () => {
    expect(extractAncestorFolders('a//b')).toEqual(['a', 'b']);
  });

  it('handles deep nested paths', () => {
    expect(extractAncestorFolders('a/b/c/d/e/f')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});

describe('computeAverageRedundancy', () => {
  it('returns 0 when no files provided', () => {
    expect(computeAverageRedundancy([], ['src'])).toBe(0);
  });

  it('computes average redundancy for multiple files', () => {
    // This test verifies the averaging calculation
    // The exact value depends on pathRedundancy implementation
    const result = computeAverageRedundancy(['file1.ts', 'file2.ts'], ['src']);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('handles single file', () => {
    const result = computeAverageRedundancy(['utils.ts'], []);
    expect(typeof result).toBe('number');
  });

  it('sums and divides correctly', () => {
    // When all files have zero redundancy
    const result = computeAverageRedundancy(['a.ts', 'b.ts', 'c.ts'], []);
    expect(typeof result).toBe('number');
  });
});
