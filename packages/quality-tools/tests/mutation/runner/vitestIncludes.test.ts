import { describe, expect, it } from 'vitest';
import { resolveScopedVitestIncludes } from '../../../src/mutation/runner/vitestIncludes';
import type { QualityTarget } from '../../../src/shared/resolve/target';

function target(overrides: Partial<QualityTarget>): QualityTarget {
  return {
    absolutePath: '/repo/packages/extension',
    kind: 'package',
    packageName: 'extension',
    packageRelativePath: '.',
    packageRoot: '/repo/packages/extension',
    relativePath: 'packages/extension',
    ...overrides,
  };
}

describe('resolveScopedVitestIncludes', () => {
  it('returns undefined for package targets', () => {
    expect(resolveScopedVitestIncludes(target({ kind: 'package' }))).toBeUndefined();
  });

  it('returns mirrored file and split-folder test patterns for file targets', () => {
    const includes = resolveScopedVitestIncludes(
      target({
        absolutePath: '/repo/packages/extension/src/extension/graphViewProvider.ts',
        kind: 'file',
        packageRelativePath: 'src/extension/graphViewProvider.ts',
        relativePath: 'packages/extension/src/extension/graphViewProvider.ts',
      }),
    );

    expect(includes).toContain('packages/extension/tests/extension/graphViewProvider.test.ts');
    expect(includes).toContain('packages/extension/tests/extension/graphViewProvider/**/*.test.ts');
    expect(includes).toContain('packages/extension/tests/**/graphViewProvider*.test.ts');
    expect(includes).toContain('packages/extension/tests/**/graphViewProvider/**/*.test.ts');
  });

  it('skips broad basename fallback patterns for generic file names', () => {
    const includes = resolveScopedVitestIncludes(
      target({
        absolutePath: '/repo/packages/extension/src/extension/graphView/provider/runtime.ts',
        kind: 'file',
        packageRelativePath: 'src/extension/graphView/provider/runtime.ts',
        relativePath: 'packages/extension/src/extension/graphView/provider/runtime.ts',
      }),
    );

    expect(includes).toContain('packages/extension/tests/extension/graphView/provider/runtime.test.ts');
    expect(includes).not.toContain('packages/extension/tests/**/runtime.test.ts');
    expect(includes).not.toContain('packages/extension/tests/**/runtime/**/*.test.ts');
  });

  it('returns mirrored directory test patterns for directory targets', () => {
    expect(
      resolveScopedVitestIncludes(
        target({
          absolutePath: '/repo/packages/extension/src/core/views',
          kind: 'directory',
          packageRelativePath: 'src/core/views',
          relativePath: 'packages/extension/src/core/views',
        }),
      ),
    ).toEqual([
      'packages/extension/tests/core/views/**/*.test.ts',
      'packages/extension/tests/core/views/**/*.test.tsx',
      'packages/extension/__tests__/core/views/**/*.test.ts',
      'packages/extension/__tests__/core/views/**/*.test.tsx',
    ]);
  });

  it('returns undefined when the target is outside src', () => {
    expect(
      resolveScopedVitestIncludes(
        target({
          absolutePath: '/repo/packages/extension/tests/core/views',
          kind: 'directory',
          packageRelativePath: 'tests/core/views',
          relativePath: 'packages/extension/tests/core/views',
        }),
      ),
    ).toBeUndefined();
  });
});
