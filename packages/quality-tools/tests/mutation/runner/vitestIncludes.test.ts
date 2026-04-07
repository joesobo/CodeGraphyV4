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
  it('returns package-local test patterns for package targets', () => {
    expect(resolveScopedVitestIncludes(target({ kind: 'package' }))).toEqual([
      'packages/extension/tests/**/*.test.ts',
      'packages/extension/tests/**/*.test.tsx',
      'packages/extension/__tests__/**/*.test.ts',
      'packages/extension/__tests__/**/*.test.tsx',
    ]);
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

  it('matches dotted test names for nested source files', () => {
    const includes = resolveScopedVitestIncludes(
      target({
        absolutePath: '/repo/packages/plugin-typescript/src/focusedImports/filter.ts',
        kind: 'file',
        packageName: 'plugin-typescript',
        packageRelativePath: 'src/focusedImports/filter.ts',
        packageRoot: '/repo/packages/plugin-typescript',
        relativePath: 'packages/plugin-typescript/src/focusedImports/filter.ts',
      }),
    );

    expect(includes).toContain('packages/plugin-typescript/__tests__/focusedImports.filter.test.ts');
    expect(includes).toContain('packages/plugin-typescript/__tests__/**/focusedImports.filter.test.ts');
  });

  it('includes shared detector tests for source rule files', () => {
    const includes = resolveScopedVitestIncludes(
      target({
        absolutePath: '/repo/packages/plugin-python/src/sources/from-import-relative.ts',
        kind: 'file',
        packageName: 'plugin-python',
        packageRelativePath: 'src/sources/from-import-relative.ts',
        packageRoot: '/repo/packages/plugin-python',
        relativePath: 'packages/plugin-python/src/sources/from-import-relative.ts',
      }),
    );

    expect(includes).toContain('packages/plugin-python/__tests__/**/ruleDetectors.test.ts');
    expect(includes).toContain('packages/plugin-python/__tests__/**/*Detectors.test.ts');
  });

  it('includes camel-cased rule tests for hyphenated source rule files', () => {
    const includes = resolveScopedVitestIncludes(
      target({
        absolutePath: '/repo/packages/plugin-csharp/src/sources/type-usage.ts',
        kind: 'file',
        packageName: 'plugin-csharp',
        packageRelativePath: 'src/sources/type-usage.ts',
        packageRoot: '/repo/packages/plugin-csharp',
        relativePath: 'packages/plugin-csharp/src/sources/type-usage.ts',
      }),
    );

    expect(includes).toContain('packages/plugin-csharp/__tests__/sources/typeUsageRule.test.ts');
    expect(includes).toContain('packages/plugin-csharp/__tests__/**/typeUsageRule.test.ts');
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
