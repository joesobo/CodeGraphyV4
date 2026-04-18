import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolvePackageCandidates } from '../../src/boundaries/selection';
import type { WorkspacePackage } from '../../src/shared/util/workspacePackages';

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => rmSync(tempDir, { force: true, recursive: true }));
});

function createWorkspace(): { repoRoot: string; workspacePackage: WorkspacePackage } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-selection-'));
  tempDirs.push(repoRoot);
  const packageRoot = join(repoRoot, 'packages', 'example');

  writeFileSync(
    join(repoRoot, 'quality.config.json'),
    JSON.stringify({
      defaults: {
        boundaries: {
          include: ['src/**/*.ts'],
          exclude: ['src/**/*.test.ts', '**/index.ts']
        }
      }
    })
  );

  for (const [relativePath, source] of Object.entries({
    'src/a.ts': 'export const a = 1;\n',
    'src/a.test.ts': 'export const test = 1;\n',
    'src/nested/b.ts': 'export const b = 1;\n',
    'src/nested/index.ts': 'export const index = 1;\n',
    'README.md': '# example\n'
  })) {
    const absolutePath = join(packageRoot, relativePath);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(absolutePath, source);
  }

  return {
    repoRoot,
    workspacePackage: {
      name: 'example',
      root: packageRoot
    }
  };
}

describe('resolvePackageCandidates', () => {
  it('returns sorted boundary-scope files after applying include and exclude patterns', () => {
    const { repoRoot, workspacePackage } = createWorkspace();

    expect(resolvePackageCandidates(repoRoot, workspacePackage)).toEqual([
      join(workspacePackage.root, 'src/a.ts'),
      join(workspacePackage.root, 'src/nested/b.ts')
    ]);
  });

  it('keeps configured entrypoints even when broad excludes match them', () => {
    const { repoRoot, workspacePackage } = createWorkspace();
    writeFileSync(
      join(repoRoot, 'quality.config.json'),
      JSON.stringify({
        defaults: {
        boundaries: {
          include: ['src/**/*.ts'],
          exclude: ['src/**/*.test.ts', '**/index.ts']
        }
      },
        packages: {
          example: {
            boundaries: {
              entrypoints: ['src/nested/index.ts']
            }
          }
        }
      })
    );

    expect(resolvePackageCandidates(repoRoot, workspacePackage)).toEqual([
      join(workspacePackage.root, 'src/a.ts'),
      join(workspacePackage.root, 'src/nested/b.ts'),
      join(workspacePackage.root, 'src/nested/index.ts')
    ]);
  });
});
