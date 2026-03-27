import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { assertSourceScope, resolveSourceScope } from '../../src/shared/sourceScope';
import { resolveQualityTarget } from '../../src/shared/resolveTarget';

describe('resolveSourceScope', () => {
  it('returns packages for repo targets', () => {
    expect(resolveSourceScope(resolveQualityTarget(REPO_ROOT))).toBe('packages');
  });

  it('returns the src root for package targets', () => {
    expect(resolveSourceScope(resolveQualityTarget(REPO_ROOT, 'quality-tools/'))).toBe(
      'packages/quality-tools/src'
    );
  });

  it('returns the exact source path for file targets', () => {
    expect(
      resolveSourceScope(resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/src/shared/sourceScope.ts'))
    ).toBe('packages/quality-tools/src/shared/sourceScope.ts');
  });

  it('returns the package src directory when the target is the src folder itself', () => {
    expect(
      resolveSourceScope(resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/src'))
    ).toBe('packages/quality-tools/src');
  });

  it('returns undefined for test-tree targets', () => {
    expect(
      resolveSourceScope(resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/tests'))
    ).toBeUndefined();
  });

  it('returns undefined when package metadata is missing', () => {
    expect(resolveSourceScope({
      absolutePath: `${REPO_ROOT}/docs`,
      kind: 'directory',
      packageRelativePath: 'src',
      relativePath: 'docs'
    })).toBeUndefined();
  });
});

describe('assertSourceScope', () => {
  it('throws for non-source targets', () => {
    expect(() => assertSourceScope(resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/tests'))).toThrow(
      'This command expects a package root or a path inside a package src/ tree.'
    );
  });
});
