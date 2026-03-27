import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { resolveQualityTarget } from '../../src/shared/resolveTarget';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { assertSourceScope } from '../../src/shared/sourceScope';

describe('resolveQualityTarget', () => {
  it('resolves package shorthand targets', () => {
    const target = resolveQualityTarget(REPO_ROOT, 'extension/');
    expect(target.kind).toBe('package');
    expect(target.packageName).toBe('extension');
    expect(target.packageRelativePath).toBe('.');
    expect(target.relativePath).toBe('packages/extension');
  });

  it('resolves quality-tools shorthand to the package root', () => {
    const target = resolveQualityTarget(REPO_ROOT, 'quality-tools/');
    expect(target.kind).toBe('package');
    expect(target.packageName).toBe('quality-tools');
    expect(target.relativePath).toBe('packages/quality-tools');
  });

  it('resolves explicit source files inside a package', () => {
    const target = resolveQualityTarget(
      REPO_ROOT,
      'packages/quality-tools/src/cli/crap.ts'
    );
    expect(target.kind).toBe('file');
    expect(target.packageName).toBe('quality-tools');
    expect(target.packageRelativePath).toBe('src/cli/crap.ts');
    expect(assertSourceScope(target)).toBe('packages/quality-tools/src/cli/crap.ts');
  });

  it('throws when the target does not exist', () => {
    expect(() => resolveQualityTarget(REPO_ROOT, 'missing-package/')).toThrow(
      'Target not found'
    );
  });

  it('resolves non-package paths without package metadata', () => {
    const target = resolveQualityTarget(REPO_ROOT, 'docs/quality');
    expect(target.kind).toBe('directory');
    expect(target.packageName).toBeUndefined();
    expect(target.relativePath).toBe('docs/quality');
  });

  it('resolves the repo root when no target is provided', () => {
    const target = resolveQualityTarget(REPO_ROOT);
    expect(target.kind).toBe('repo');
    expect(target.absolutePath).toBe(resolve(REPO_ROOT));
    expect(target.relativePath).toBe('.');
  });
});
