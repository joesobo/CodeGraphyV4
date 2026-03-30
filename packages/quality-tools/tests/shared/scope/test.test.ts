import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';
import { resolveQualityTarget } from '../../../src/shared/resolve/target';
import type { QualityTarget } from '../../../src/shared/resolve/target';
import { existingTestRoots, isTestPath } from './testRootsSupport';

function resolveTestScopes(target: QualityTarget): string[] {
  if (target.kind === 'repo') {
    return ['packages'];
  }

  if (!target.packageName || !target.packageRoot) {
    return [];
  }

  if (target.kind === 'package') {
    return existingTestRoots(target.packageRoot, target.packageName);
  }

  if (isTestPath(target.packageRelativePath)) {
    return [target.relativePath];
  }

  return [];
}

describe('resolveTestScopes', () => {
  it('returns the packages root for repo targets', () => {
    const scopes = resolveTestScopes(resolveQualityTarget(REPO_ROOT));
    expect(scopes).toEqual(['packages']);
  });

  it('returns both test roots for a package target when they exist', () => {
    const scopes = resolveTestScopes(resolveQualityTarget(REPO_ROOT, 'quality-tools/'));
    expect(scopes).toEqual(['packages/quality-tools/tests']);
  });

  it('returns the selected test directory when targeting tests directly', () => {
    const scopes = resolveTestScopes(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/tests')
    );

    expect(scopes).toEqual(['packages/quality-tools/tests']);
  });

  it('returns an empty list for source-tree targets', () => {
    const scopes = resolveTestScopes(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/src')
    );

    expect(scopes).toEqual([]);
  });

  it('returns an empty list for non-package targets without package metadata', () => {
    expect(resolveTestScopes({
      absolutePath: `${REPO_ROOT}/docs`,
      kind: 'directory',
      relativePath: 'docs'
    })).toEqual([]);
  });

  it('returns an empty list when package metadata is incomplete', () => {
    expect(resolveTestScopes({
      absolutePath: `${REPO_ROOT}/packages/incomplete/tests`,
      kind: 'directory',
      packageName: 'incomplete',
      packageRelativePath: 'tests',
      relativePath: 'packages/incomplete/tests'
    })).toEqual([]);
  });
});
