import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { resolvePackageRoot, resolveRepoRoot } from '../../../src/shared/resolve/repoRoot';

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => {
    rmSync(tempDir, { force: true, recursive: true });
  });
});

function createWorkspace(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-repo-root-'));
  tempDirs.push(repoRoot);

  mkdirSync(join(repoRoot, 'packages', 'quality-tools', 'src', 'shared', 'resolve'), { recursive: true });
  writeFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  writeFileSync(join(repoRoot, 'packages', 'quality-tools', 'package.json'), '{"name":"@codegraphy/quality-tools"}');

  return repoRoot;
}

describe('repoRoot', () => {
  it('uses TEST_REPO_ROOT when provided', () => {
    expect(
      resolveRepoRoot({
        cwd: '/ignored',
        env: { TEST_REPO_ROOT: '/tmp/custom-repo' },
        moduleUrl: 'https://example.com/@id/repoRoot.ts'
      })
    ).toBe('/tmp/custom-repo');
  });

  it('walks up from a file module URL to the workspace root', () => {
    const repoRoot = createWorkspace();
    const moduleUrl = pathToFileURL(
      join(repoRoot, 'packages', 'quality-tools', 'src', 'shared', 'resolve', 'repoRoot.ts')
    ).href;

    expect(
      resolveRepoRoot({
        cwd: '/ignored',
        env: {},
        moduleUrl
      })
    ).toBe(repoRoot);
    expect(
      resolvePackageRoot({
        cwd: '/ignored',
        env: {},
        moduleUrl
      })
    ).toBe(join(repoRoot, 'packages', 'quality-tools'));
  });

  it('falls back to cwd when the module URL is not file-based', () => {
    const repoRoot = createWorkspace();

    expect(
      resolveRepoRoot({
        cwd: join(repoRoot, 'packages', 'quality-tools'),
        env: {},
        moduleUrl: 'http://localhost:5173/@id/repoRoot.ts'
      })
    ).toBe(repoRoot);
  });
});
