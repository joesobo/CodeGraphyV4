import { describe, expect, it } from 'vitest';
import {
  comparePathDepth,
  filterFavoritesForDeletedPaths,
  isPathWithinDeletedPath,
  sortDirectoryPathsByDepth,
} from '../../../../src/extension/actions/deleteFiles/paths';

describe('extension/actions/deleteFiles/paths', () => {
  it('matches exact deleted paths and nested children only', () => {
    expect(isPathWithinDeletedPath('src/app.ts', 'src')).toBe(true);
    expect(isPathWithinDeletedPath('src', 'src')).toBe(true);
    expect(isPathWithinDeletedPath('src-old/app.ts', 'src')).toBe(false);
  });

  it('removes favorites under any deleted path', () => {
    expect(filterFavoritesForDeletedPaths(
      ['src/app.ts', 'docs/readme.md', 'tests/app.test.ts'],
      ['dist', 'src'],
    )).toEqual(['docs/readme.md', 'tests/app.test.ts']);
  });

  it('compares path depth by slash-separated segments', () => {
    expect(comparePathDepth('src', 'src/nested')).toBeLessThan(0);
    expect(comparePathDepth('src/nested/leaf', 'src/nested')).toBeGreaterThan(0);
    expect(comparePathDepth('src/a', 'docs/b')).toBe(0);
  });

  it('sorts parent directories before nested directories without mutating the input', () => {
    const paths = ['src/nested/leaf', 'src', 'src/nested'];

    expect(sortDirectoryPathsByDepth(paths)).toEqual([
      'src',
      'src/nested',
      'src/nested/leaf',
    ]);
    expect(paths).toEqual(['src/nested/leaf', 'src', 'src/nested']);
  });
});
