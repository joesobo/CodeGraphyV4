import { join } from 'path';
import { describe, expect, it, afterEach } from 'vitest';
import { walkDirectories } from '../../../src/organize/metric/directoryWalk';
import { cleanupTempDirs, createFileTree, createTempDir, TS_CODE } from '../testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('walkDirectories - discovery', () => {
  it('returns the root directory with empty files and subdirectories for an empty directory', () => {
    const root = createTempDir(tempDirs);
    const result = walkDirectories(root);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      directoryPath: root,
      files: [],
      subdirectories: []
    });
  });

  it('discovers TypeScript and JavaScript files in the root directory', () => {
    const root = createFileTree(
      {
        'file.ts': TS_CODE.SIMPLE_EXPORT,
        'file.tsx': 'export const Element = <div />;',
        'file.js': 'module.exports = {};',
        'file.jsx': 'module.exports = {};',
        'README.md': '# README'
      },
      tempDirs
    );

    const result = walkDirectories(root);

    expect(result).toHaveLength(1);
    expect(result[0]?.files).toEqual(expect.arrayContaining(['file.ts', 'file.tsx', 'file.js', 'file.jsx']));
    expect(result[0]?.files).not.toContain('README.md');
  });

  it('discovers subdirectories', () => {
    const root = createFileTree(
      {
        'src/index.ts': 'export const x = 1;',
        'tests/index.test.ts': 'test("", () => {});'
      },
      tempDirs
    );

    const result = walkDirectories(root);

    const rootEntry = result.find((e) => e.directoryPath === root);
    expect(rootEntry?.subdirectories).toEqual(expect.arrayContaining(['src', 'tests']));
  });

  it('returns entries for all directories recursively', () => {
    const root = createFileTree(
      {
        'root.ts': 'export const x = 1;',
        'src/index.ts': 'export const y = 1;',
        'src/core/logic.ts': 'export const z = 1;',
        'tests/index.test.ts': 'test("", () => {});'
      },
      tempDirs
    );

    const result = walkDirectories(root);

    expect(result).toHaveLength(4);
    const paths = result.map((e) => e.directoryPath);
    expect(paths).toContain(root);
    expect(paths).toContain(join(root, 'src'));
    expect(paths).toContain(join(root, 'src', 'core'));
    expect(paths).toContain(join(root, 'tests'));
  });

  it('only includes TS/JS files with valid extensions', () => {
    const root = createFileTree(
      {
        'file.ts': '',
        'file.tsx': '',
        'file.js': '',
        'file.jsx': '',
        'file.json': '{}',
        'file.md': '# Readme',
        'file.txt': 'text',
        'file.d.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);

    expect(result[0]?.files).toHaveLength(5);
    expect(result[0]?.files).toContain('file.ts');
    expect(result[0]?.files).toContain('file.tsx');
    expect(result[0]?.files).toContain('file.js');
    expect(result[0]?.files).toContain('file.jsx');
    expect(result[0]?.files).toContain('file.d.ts');
  });

  it('includes root directory even if it has no files or subdirectories', () => {
    const root = createTempDir(tempDirs);

    const result = walkDirectories(root);

    expect(result).toHaveLength(1);
    expect(result[0]?.directoryPath).toBe(root);
  });

  it('correctly separates files and subdirectories in the same directory', () => {
    const root = createFileTree(
      {
        'file1.ts': '',
        'file2.js': '',
        'subdir/nested.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);
    const rootEntry = result.find((e) => e.directoryPath === root);

    expect(rootEntry?.files).toEqual(expect.arrayContaining(['file1.ts', 'file2.js']));
    expect(rootEntry?.files).not.toContain('nested.ts');
    expect(rootEntry?.subdirectories).toContain('subdir');
  });

  it('handles deeply nested directories', () => {
    const root = createFileTree(
      {
        'a/b/c/d/e/deep.ts': ''
      },
      tempDirs
    );

    const result = walkDirectories(root);

    expect(result.length).toBeGreaterThan(1);
    const paths = result.map((entry) => entry.directoryPath);
    expect(paths.some((path) => path.includes('a/b/c/d/e') || path.includes('a\\b\\c\\d\\e'))).toBe(true);
  });
});
