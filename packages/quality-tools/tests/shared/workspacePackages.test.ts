import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { listWorkspacePackages, resolveWorkspacePackages } from '../../src/shared/workspacePackages';

function createWorkspaceRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-workspaces-'));
  mkdirSync(join(repoRoot, 'packages/alpha'), { recursive: true });
  mkdirSync(join(repoRoot, 'packages/zeta'), { recursive: true });
  mkdirSync(join(repoRoot, 'packages/no-package'), { recursive: true });
  writeFileSync(join(repoRoot, 'packages/README.md'), 'not a package');
  writeFileSync(join(repoRoot, 'packages/alpha/package.json'), '{}');
  writeFileSync(join(repoRoot, 'packages/zeta/package.json'), '{}');
  return repoRoot;
}

function dirent(name: string, isDirectory: boolean): {
  isDirectory(): boolean;
  name: string;
} {
  return {
    isDirectory: () => isDirectory,
    name
  };
}

describe('listWorkspacePackages', () => {
  it('returns sorted packages with package.json files', () => {
    const repoRoot = createWorkspaceRepo();
    expect(listWorkspacePackages(repoRoot)).toEqual([
      { name: 'alpha', root: join(repoRoot, 'packages/alpha') },
      { name: 'zeta', root: join(repoRoot, 'packages/zeta') }
    ]);
  });

  it('filters non-directories and sorts unsorted filesystem results', () => {
    const repoRoot = createWorkspaceRepo();
    expect(resolveWorkspacePackages(join(repoRoot, 'packages'), [
      dirent('zeta', true),
      dirent('README.md', false),
      dirent('alpha', true)
    ])).toEqual([
      { name: 'alpha', root: join(repoRoot, 'packages/alpha') },
      { name: 'zeta', root: join(repoRoot, 'packages/zeta') }
    ]);
  });
});
