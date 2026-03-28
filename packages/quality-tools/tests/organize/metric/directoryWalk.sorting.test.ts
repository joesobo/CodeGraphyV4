import { join } from 'path';
import { describe, expect, it, afterEach } from 'vitest';
import { sortDirectoryEntries, sortDirectoryNames, walkDirectories } from '../../../src/organize/metric/directoryWalk';
import { cleanupTempDirs, createFileTree } from '../testHelpers';

const tempDirs: string[] = [];

afterEach(() => cleanupTempDirs(tempDirs));

describe('walkDirectories - sorting', () => {
  it('returns entries sorted by path', () => {
    const root = createFileTree(
      {
        'zebra/file.ts': '',
        'alpha/file.ts': '',
        'alpha/beta/file.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    const sortedPaths = [...paths].sort();
    expect(paths).toEqual(sortedPaths);
    expect(result.length).toBe(4);
  });

  it('returns absolute paths for directoryPath', () => {
    const root = createFileTree(
      {
        'src/index.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);

    for (const entry of result) {
      expect(entry.directoryPath).toBe(entry.directoryPath.replace(/\\/g, '/').split('/').join('/'));
      expect(entry.directoryPath).toContain(root);
    }
  });

  it('returns files in sorted alphabetical order', () => {
    const root = createFileTree(
      {
        'zebra.ts': '',
        'alpha.ts': '',
        'middle.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);
    const rootEntry = result[0];

    expect(rootEntry?.files).toEqual(['alpha.ts', 'middle.ts', 'zebra.ts']);
    expect(rootEntry?.files.length).toBe(3);
  });

  it('returns subdirectories in sorted alphabetical order', () => {
    const root = createFileTree(
      {
        'zebra/file.ts': '',
        'alpha/file.ts': '',
        'middle/file.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);
    const rootEntry = result[0];

    expect(rootEntry?.subdirectories).toEqual(['alpha', 'middle', 'zebra']);
    expect(rootEntry?.subdirectories.length).toBe(3);
  });

  it('maintains sorted order even with mixed character cases in filenames', () => {
    const root = createFileTree(
      {
        'Zebra.ts': '',
        'alpha.ts': '',
        'MIDDLE.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);
    const files = result[0]?.files ?? [];

    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
    expect(files.length).toBe(3);
  });

  it('maintains sorted order for entries across multiple directories', () => {
    const root = createFileTree(
      {
        'z-dir/file.ts': '',
        'a-dir/file.ts': '',
        'm-dir/file.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);

    const paths = result.map((entry) => entry.directoryPath);
    for (let ii = 1; ii < paths.length; ii++) {
      expect(paths[ii].localeCompare(paths[ii - 1])).toBeGreaterThanOrEqual(0);
    }
    expect(result.length).toBe(4);
  });

  it('returns files sorted in each directory independently', () => {
    const root = createFileTree(
      {
        'dir1/zulu.ts': '',
        'dir1/alpha.ts': '',
        'dir2/yak.ts': '',
        'dir2/bravo.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);
    const dir1Entry = result.find((e) => e.directoryPath === join(root, 'dir1'));
    const dir2Entry = result.find((e) => e.directoryPath === join(root, 'dir2'));

    expect(dir1Entry?.files).toEqual(['alpha.ts', 'zulu.ts']);
    expect(dir2Entry?.files).toEqual(['bravo.ts', 'yak.ts']);
    expect(dir1Entry?.files.length).toBe(2);
    expect(dir2Entry?.files.length).toBe(2);
  });

  it('sorts directory names directly', () => {
    expect(sortDirectoryNames(['zeta.ts', 'alpha.ts', 'beta.ts'])).toEqual([
      'alpha.ts',
      'beta.ts',
      'zeta.ts'
    ]);
  });

  it('sorts directory entries directly', () => {
    expect(sortDirectoryEntries([
      { directoryPath: '/repo/zeta', files: [], subdirectories: [] },
      { directoryPath: '/repo/alpha', files: [], subdirectories: [] },
      { directoryPath: '/repo/beta', files: [], subdirectories: [] }
    ]).map((entry) => entry.directoryPath)).toEqual([
      '/repo/alpha',
      '/repo/beta',
      '/repo/zeta'
    ]);
  });

  it('handles numeric filenames in sorted order', () => {
    const root = createFileTree(
      {
        '3-file.ts': '',
        '1-file.ts': '',
        '2-file.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);
    const files = result[0]?.files ?? [];

    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
    expect(files).toEqual(['1-file.ts', '2-file.ts', '3-file.ts']);
  });

  it('returns empty arrays with proper sorting for directory with no files', () => {
    const root = createFileTree(
      {
        'empty': null
      },
      tempDirs
    );

    const result = walkDirectories(root);
    const emptyEntry = result.find((e) => e.directoryPath === join(root, 'empty'));

    expect(emptyEntry?.files).toEqual([]);
    expect(emptyEntry?.subdirectories).toEqual([]);
    expect(emptyEntry?.files.length).toBe(0);
  });

  describe('mutation killers for directoryWalk.ts', () => {
    it('kills mutation: MethodExpression files at line 39 must call sort()', () => {
      // Verify files are sorted
      const root = createFileTree(
        {
          'zebra.ts': '',
          'apple.ts': '',
          'middle.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);
      const files = result[0]?.files ?? [];
      expect(files).toEqual(['apple.ts', 'middle.ts', 'zebra.ts']);
    });

    it('kills mutation: MethodExpression subdirectories at line 40 must call sort()', () => {
      // Verify subdirectories are sorted
      const root = createFileTree(
        {
          'zebra/file.ts': '',
          'apple/file.ts': '',
          'middle/file.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);
      const rootEntry = result[0];
      expect(rootEntry?.subdirectories).toEqual(['apple', 'middle', 'zebra']);
    });

    it('kills mutation: MethodExpression entries at line 57 must use localeCompare for sorting', () => {
      // Verify entries are sorted by directoryPath using localeCompare
      const root = createFileTree(
        {
          'z-dir/file.ts': '',
          'a-dir/file.ts': '',
          'm-dir/file.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);
      const paths = result.map((e) => e.directoryPath);

      // Verify ordering is correct
      for (let i = 1; i < paths.length; i++) {
        expect(paths[i].localeCompare(paths[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });

    it('kills mutation: arrow function at line 57 must be executed', () => {
      // Verify the sorting function is actually used
      const root = createFileTree(
        {
          'z/file.ts': '',
          'a/file.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);
      // If sort arrow function wasn't used, order might be wrong
      const paths = result.map((e) => e.directoryPath);
      const isSorted = paths.every((path, i) => i === 0 || path.localeCompare(paths[i - 1]) >= 0);
      expect(isSorted).toBe(true);
    });

    it('kills mutation: sort() at line 39 for files', () => {
      // Verify files.sort() is actually called
      // Create files with intentionally reverse-alphabetical names
      const root = createFileTree(
        {
          'z.ts': '',
          'y.ts': '',
          'x.ts': '',
          'b.ts': '',
          'a.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);
      const files = result[0]?.files ?? [];

      // Files must be in alphabetical order
      expect(files).toEqual(['a.ts', 'b.ts', 'x.ts', 'y.ts', 'z.ts']);
      // Verify it's not just coincidence - check exact order
      for (let i = 0; i < files.length - 1; i++) {
        expect(files[i].localeCompare(files[i + 1])).toBeLessThan(0);
      }
    });

    it('kills mutation: sort() at line 40 for subdirectories', () => {
      // Verify subdirectories.sort() is actually called
      // Create subdirectories with intentionally reverse-alphabetical names
      const root = createFileTree(
        {
          'zebra/file.ts': '',
          'yankee/file.ts': '',
          'xray/file.ts': '',
          'bravo/file.ts': '',
          'alpha/file.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);
      const subdirs = result[0]?.subdirectories ?? [];

      // Subdirectories must be in alphabetical order
      expect(subdirs).toEqual(['alpha', 'bravo', 'xray', 'yankee', 'zebra']);
      // Verify strict ordering
      for (let i = 0; i < subdirs.length - 1; i++) {
        expect(subdirs[i].localeCompare(subdirs[i + 1])).toBeLessThan(0);
      }
    });

    it('kills mutation: sort() at line 57 for entries with localeCompare', () => {
      // Verify entries.sort((left, right) => ...) is actually called correctly
      // Create deep structure with directories in reverse order
      const root = createFileTree(
        {
          'zeta/file.ts': '',
          'gamma/file.ts': '',
          'alpha/file.ts': '',
          'delta/sub/file.ts': '',
          'beta/sub/file.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);
      const paths = result.map((e) => e.directoryPath);

      // All paths should be sorted by localeCompare
      for (let i = 0; i < paths.length - 1; i++) {
        const comparison = paths[i].localeCompare(paths[i + 1]);
        expect(comparison).toBeLessThanOrEqual(0);
      }
    });

    it('kills mutation: entries array must be populated before sorting at line 57', () => {
      // The sort at line 57 must work on the complete entries array
      const root = createFileTree(
        {
          'c/file.ts': '',
          'b/file.ts': '',
          'a/file.ts': ''
        },
        tempDirs
      );

      const result = walkDirectories(root);

      // Result must have entries in sorted order
      expect(result.length).toBeGreaterThan(1);
      const paths = result.map((e) => e.directoryPath);

      // Check sorted invariant
      for (let i = 1; i < paths.length; i++) {
        const prev = paths[i - 1];
        const curr = paths[i];
        expect(curr.localeCompare(prev)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
