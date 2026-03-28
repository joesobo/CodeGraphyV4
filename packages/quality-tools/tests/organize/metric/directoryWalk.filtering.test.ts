import { join } from 'path';
import { describe, expect, it, afterEach } from 'vitest';
import { walkDirectories } from '../../../src/organize/metric/directoryWalk';
import { cleanupTempDirs, createFileTree } from '../testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('walkDirectories - filtering', () => {
  it('skips node_modules directories', () => {
    const root = createFileTree(
      {
        'node_modules/package.json': '{}',
        'src/index.ts': 'export const x = 1;'
      },
      tempDirs
    );

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    expect(paths).not.toContain(join(root, 'node_modules'));
    expect(paths).toContain(join(root, 'src'));
  });

  it('skips .git directories', () => {
    const root = createFileTree(
      {
        '.git/config': '',
        'src/index.ts': 'export const x = 1;'
      },
      tempDirs
    );

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    expect(paths).not.toContain(join(root, '.git'));
    expect(paths).toContain(join(root, 'src'));
  });

  it('skips hidden directories starting with a dot', () => {
    const root = createFileTree(
      {
        '.vscode/settings.json': '{}',
        '.hidden/file.ts': 'export const x = 1;',
        'src/index.ts': 'export const y = 1;'
      },
      tempDirs
    );

    const result = walkDirectories(root);

    const paths = result.map((e) => e.directoryPath);
    expect(paths).not.toContain(join(root, '.vscode'));
    expect(paths).not.toContain(join(root, '.hidden'));
    expect(paths).toContain(join(root, 'src'));
  });
});
