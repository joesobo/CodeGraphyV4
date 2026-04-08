import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { packageRootFrom } from '../../../src/shared/resolve/packageRoot';

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => rmSync(tempDir, { force: true, recursive: true }));
});

function createWorkspace(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-package-root-'));
  tempDirs.push(repoRoot);
  mkdirSync(join(repoRoot, 'packages', 'quality-tools', 'src', 'shared'), { recursive: true });
  writeFileSync(join(repoRoot, 'packages', 'quality-tools', 'package.json'), '{"name":"@codegraphy/quality-tools"}');
  return repoRoot;
}

describe('packageRootFrom', () => {
  it('returns undefined without a start path', () => {
    expect(packageRootFrom('/repo')).toBeUndefined();
  });

  it('walks up until it finds a package.json below the repo root', () => {
    const repoRoot = createWorkspace();
    expect(packageRootFrom(repoRoot, join(repoRoot, 'packages', 'quality-tools', 'src', 'shared'))).toBe(
      join(repoRoot, 'packages', 'quality-tools')
    );
  });

  it('returns undefined when it reaches the repo root without finding a package', () => {
    const repoRoot = createWorkspace();
    expect(packageRootFrom(repoRoot, join(repoRoot, 'packages'))).toBeUndefined();
  });

  it('returns undefined when the search starts at the filesystem root', () => {
    expect(packageRootFrom('/')).toBeUndefined();
  });

  it('does not treat the repo root itself as the package root', () => {
    const repoRoot = createWorkspace();
    writeFileSync(join(repoRoot, 'package.json'), '{"name":"repo-root"}');

    expect(packageRootFrom(repoRoot, join(repoRoot, 'nested'))).toBeUndefined();
  });
});
