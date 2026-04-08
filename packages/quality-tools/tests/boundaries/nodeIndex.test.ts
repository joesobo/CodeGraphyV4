import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodesByPath } from '../../src/boundaries/nodeIndex';
import type { WorkspacePackage } from '../../src/shared/util/workspacePackages';

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => rmSync(tempDir, { force: true, recursive: true }));
});

function createWorkspace(): { repoRoot: string; workspacePackage: WorkspacePackage } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-node-index-'));
  tempDirs.push(repoRoot);
  const packageRoot = join(repoRoot, 'packages', 'example');

  writeFileSync(
    join(repoRoot, 'quality.config.json'),
    JSON.stringify({
      defaults: {
        boundaries: {
          include: ['src/**/*.ts']
        }
      },
      packages: {
        example: {
          boundaries: {
            entrypoints: ['src/extension/activate.ts'],
            layers: [
              { allow: ['shared'], include: ['src/extension/**'], name: 'extension' },
              { allow: [], include: ['src/shared/**'], name: 'shared' }
            ]
          }
        }
      }
    })
  );

  for (const relativePath of ['src/extension/activate.ts', 'src/shared/file.ts']) {
    const absolutePath = join(packageRoot, relativePath);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(absolutePath, 'export const value = 1;\n');
  }

  return {
    repoRoot,
    workspacePackage: {
      name: 'example',
      root: packageRoot
    }
  };
}

describe('createNodesByPath', () => {
  it('builds node metadata and allowed-layer lookups from the package config', () => {
    const { repoRoot, workspacePackage } = createWorkspace();
    const { candidatePaths, nodesByPath } = createNodesByPath(repoRoot, workspacePackage);

    expect([...candidatePaths]).toEqual([
      join(workspacePackage.root, 'src/extension/activate.ts'),
      join(workspacePackage.root, 'src/shared/file.ts')
    ]);
    expect(nodesByPath.get(join(workspacePackage.root, 'src/extension/activate.ts'))).toMatchObject({
      allowedLayers: ['shared'],
      entrypoint: true,
      layer: 'extension'
    });
    expect(nodesByPath.get(join(workspacePackage.root, 'src/shared/file.ts'))).toMatchObject({
      allowedLayers: [],
      entrypoint: false,
      layer: 'shared'
    });
  });
});
