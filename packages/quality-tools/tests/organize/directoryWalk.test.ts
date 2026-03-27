import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it, afterEach } from 'vitest';
import { walkDirectories, type DirectoryEntry } from '../../src/organize/directoryWalk';

let tempDirs: string[] = [];

function createTempDir(): string {
  const temp = mkdtempSync(join(tmpdir(), 'walk-directories-'));
  tempDirs.push(temp);
  return temp;
}

afterEach(() => {
  tempDirs = [];
});

describe('walkDirectories', () => {
  it('returns the root directory with empty files and subdirectories for an empty directory', () => {
    const root = createTempDir();
    const result = walkDirectories(root);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      directoryPath: root,
      files: [],
      subdirectories: []
    });
  });

  it('discovers TypeScript and JavaScript files in the root directory', () => {
    const root = createTempDir();
    writeFileSync(join(root, 'file.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'file.tsx'), 'export const Element = <div />;');
    writeFileSync(join(root, 'file.js'), 'module.exports = {};');
    writeFileSync(join(root, 'file.jsx'), 'module.exports = {};');
    writeFileSync(join(root, 'README.md'), '# README');

    const result = walkDirectories(root);

    expect(result).toHaveLength(1);
    expect(result[0]?.files).toEqual(expect.arrayContaining(['file.ts', 'file.tsx', 'file.js', 'file.jsx']));
    expect(result[0]?.files).not.toContain('README.md');
  });

  it('discovers subdirectories', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'tests'));
    writeFileSync(join(root, 'src', 'index.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'tests', 'index.test.ts'), 'test("", () => {});');

    const result = walkDirectories(root);

    const rootEntry = result.find((e) => e.directoryPath === root);
    expect(rootEntry?.subdirectories).toEqual(expect.arrayContaining(['src', 'tests']));
  });

  it('returns entries for all directories recursively', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'src', 'core'));
    mkdirSync(join(root, 'tests'));
    writeFileSync(join(root, 'root.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'src', 'index.ts'), 'export const y = 1;');
    writeFileSync(join(root, 'src', 'core', 'logic.ts'), 'export const z = 1;');
    writeFileSync(join(root, 'tests', 'index.test.ts'), 'test("", () => {});');

    const result = walkDirectories(root);

    expect(result).toHaveLength(4);
    const paths = result.map((e) => e.directoryPath);
    expect(paths).toContain(root);
    expect(paths).toContain(join(root, 'src'));
    expect(paths).toContain(join(root, 'src', 'core'));
    expect(paths).toContain(join(root, 'tests'));
  });

  it('skips node_modules directories', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'node_modules'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'node_modules', 'package.json'), '{}');
    writeFileSync(join(root, 'src', 'index.ts'), 'export const x = 1;');

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    expect(paths).not.toContain(join(root, 'node_modules'));
    expect(paths).toContain(join(root, 'src'));
  });

  it('skips .git directories', () => {
    const root = createTempDir();
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, '.git', 'config'), '');
    writeFileSync(join(root, 'src', 'index.ts'), 'export const x = 1;');

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    expect(paths).not.toContain(join(root, '.git'));
    expect(paths).toContain(join(root, 'src'));
  });

  it('skips hidden directories starting with a dot', () => {
    const root = createTempDir();
    mkdirSync(join(root, '.vscode'));
    mkdirSync(join(root, '.hidden'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, '.vscode', 'settings.json'), '{}');
    writeFileSync(join(root, '.hidden', 'file.ts'), 'export const x = 1;');
    writeFileSync(join(root, 'src', 'index.ts'), 'export const y = 1;');

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    expect(paths).not.toContain(join(root, '.vscode'));
    expect(paths).not.toContain(join(root, '.hidden'));
    expect(paths).toContain(join(root, 'src'));
  });

  it('only includes TS/JS files with valid extensions', () => {
    const root = createTempDir();
    writeFileSync(join(root, 'file.ts'), '');
    writeFileSync(join(root, 'file.tsx'), '');
    writeFileSync(join(root, 'file.js'), '');
    writeFileSync(join(root, 'file.jsx'), '');
    writeFileSync(join(root, 'file.json'), '{}');
    writeFileSync(join(root, 'file.md'), '# Readme');
    writeFileSync(join(root, 'file.txt'), 'text');
    writeFileSync(join(root, 'file.d.ts'), '');

    const result = walkDirectories(root);

    expect(result[0]?.files).toHaveLength(5);
    expect(result[0]?.files).toContain('file.ts');
    expect(result[0]?.files).toContain('file.tsx');
    expect(result[0]?.files).toContain('file.js');
    expect(result[0]?.files).toContain('file.jsx');
    expect(result[0]?.files).toContain('file.d.ts');
  });

  it('returns entries sorted by path', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'zebra'));
    mkdirSync(join(root, 'alpha'));
    mkdirSync(join(root, 'alpha', 'beta'));
    writeFileSync(join(root, 'alpha', 'file.ts'), '');
    writeFileSync(join(root, 'alpha', 'beta', 'file.ts'), '');
    writeFileSync(join(root, 'zebra', 'file.ts'), '');

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    const sortedPaths = [...paths].sort();
    expect(paths).toEqual(sortedPaths);
  });

  it('returns absolute paths for directoryPath', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'index.ts'), '');

    const result = walkDirectories(root);

    for (const entry of result) {
      expect(entry.directoryPath).toBe(entry.directoryPath.replace(/\\/g, '/').split('/').join('/'));
    }
  });

  it('handles deeply nested directories', () => {
    const root = createTempDir();
    const deepPath = join(root, 'a', 'b', 'c', 'd', 'e');
    mkdirSync(deepPath, { recursive: true });
    writeFileSync(join(deepPath, 'deep.ts'), '');

    const result = walkDirectories(root);

    expect(result.length).toBeGreaterThan(1);
    const paths = result.map((e) => e.directoryPath);
    expect(paths).toContain(deepPath);
  });

  it('includes root directory even if it has no files or subdirectories', () => {
    const root = createTempDir();

    const result = walkDirectories(root);

    expect(result).toHaveLength(1);
    expect(result[0]?.directoryPath).toBe(root);
  });

  it('correctly separates files and subdirectories in the same directory', () => {
    const root = createTempDir();
    mkdirSync(join(root, 'subdir'));
    writeFileSync(join(root, 'file1.ts'), '');
    writeFileSync(join(root, 'file2.js'), '');
    writeFileSync(join(root, 'subdir', 'nested.ts'), '');

    const result = walkDirectories(root);
    const rootEntry = result.find((e) => e.directoryPath === root);

    expect(rootEntry?.files).toEqual(expect.arrayContaining(['file1.ts', 'file2.js']));
    expect(rootEntry?.files).not.toContain('nested.ts');
    expect(rootEntry?.subdirectories).toContain('subdir');
  });
});
