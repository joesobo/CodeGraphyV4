import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { pathKind, resolveExistingPath } from '../../src/shared/resolvePath';

function createRepo(): { filePath: string; packageRoot: string; repoRoot: string } {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-resolve-path-'));
  const packageRoot = join(repoRoot, 'packages/example');
  const filePath = join(packageRoot, 'src/file.ts');
  mkdirSync(join(packageRoot, 'src'), { recursive: true });
  writeFileSync(filePath, 'export const value = 1;');
  return { filePath, packageRoot, repoRoot };
}

describe('resolveExistingPath', () => {
  it('resolves repo root when no input is given', () => {
    const { repoRoot } = createRepo();
    expect(resolveExistingPath(repoRoot)).toBe(repoRoot);
  });

  it('treats dot as the repo root target', () => {
    const { repoRoot } = createRepo();
    expect(resolveExistingPath(repoRoot, '.')).toBe(repoRoot);
  });

  it('resolves package shorthand from packages/', () => {
    const { packageRoot, repoRoot } = createRepo();
    expect(resolveExistingPath(repoRoot, 'example/')).toBe(packageRoot);
  });

  it('trims repeated trailing slashes before resolving a shorthand path', () => {
    const { packageRoot, repoRoot } = createRepo();
    expect(resolveExistingPath(repoRoot, 'example///')).toBe(packageRoot);
  });

  it('throws for missing targets', () => {
    const { repoRoot } = createRepo();
    expect(() => resolveExistingPath(repoRoot, 'missing')).toThrow('Target not found: missing');
  });
});

describe('pathKind', () => {
  it('distinguishes files from directories', () => {
    const { filePath, packageRoot } = createRepo();
    expect(pathKind(packageRoot)).toBe('directory');
    expect(pathKind(filePath)).toBe('file');
  });
});
