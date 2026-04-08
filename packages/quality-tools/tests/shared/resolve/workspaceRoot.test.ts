import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { workspaceRootFrom } from '../../../src/shared/resolve/workspaceRoot';

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => rmSync(tempDir, { force: true, recursive: true }));
});

function createWorkspace(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-workspace-root-'));
  tempDirs.push(repoRoot);
  mkdirSync(join(repoRoot, 'packages', 'quality-tools', 'src'), { recursive: true });
  writeFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  return repoRoot;
}

describe('workspaceRootFrom', () => {
  it('returns undefined without a start path', () => {
    expect(workspaceRootFrom()).toBeUndefined();
  });

  it('walks up until it finds the workspace root', () => {
    const repoRoot = createWorkspace();
    expect(workspaceRootFrom(join(repoRoot, 'packages', 'quality-tools', 'src'))).toBe(repoRoot);
  });

  it('returns undefined when no workspace file exists', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-workspace-missing-'));
    tempDirs.push(repoRoot);
    expect(workspaceRootFrom(repoRoot)).toBeUndefined();
  });

  it('returns undefined when the search starts at the filesystem root', () => {
    expect(workspaceRootFrom('/')).toBeUndefined();
  });
});
