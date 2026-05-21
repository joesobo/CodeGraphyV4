import { describe, expect, it } from 'vitest';
import { directIncludes } from '../../../src/mutation/runner/directIncludes';

describe('directIncludes', () => {
  it('builds the exact direct include set for ordinary files', () => {
    expect(
      directIncludes('packages/extension/tests', {
        camelName: 'graphViewProvider',
        directory: 'extension',
        dottedRelativePath: 'extension.graphViewProvider',
        includeBroadFallback: true,
        name: 'graphViewProvider',
        relativeTestDirectory: 'extension/'
      })
    ).toEqual([
      'packages/extension/tests/extension/graphViewProvider.test.ts',
      'packages/extension/tests/extension/graphViewProvider.test.tsx',
      'packages/extension/tests/extension/graphViewProvider.mutations.test.ts',
      'packages/extension/tests/extension/graphViewProvider.mutations.test.tsx',
      'packages/extension/tests/extension/graphViewProvider*.test.ts',
      'packages/extension/tests/extension/graphViewProvider*.test.tsx',
      'packages/extension/tests/extension/graphViewProvider/**/*.test.ts',
      'packages/extension/tests/extension/graphViewProvider/**/*.test.tsx',
      'packages/extension/tests/extension.graphViewProvider.test.ts',
      'packages/extension/tests/extension.graphViewProvider.test.tsx',
      'packages/extension/tests/extension.graphViewProvider.mutations.test.ts',
      'packages/extension/tests/extension.graphViewProvider.mutations.test.tsx',
      'packages/extension/tests/extension/graphViewProviderRule.test.ts',
      'packages/extension/tests/extension/graphViewProviderRule.test.tsx',
      'packages/extension/tests/extension.test.ts',
      'packages/extension/tests/extension.test.tsx',
      'packages/extension/tests/extension.mutations.test.ts',
      'packages/extension/tests/extension.mutations.test.tsx'
    ]);
  });

  it('keeps top-level package areas from pulling every test in that area', () => {
    const includes = directIncludes('packages/extension/tests', {
      camelName: 'vscodeApi',
      directory: 'webview',
      dottedRelativePath: 'webview.vscodeApi',
      includeBroadFallback: true,
      name: 'vscodeApi',
      relativeTestDirectory: 'webview/'
    });

    expect(includes).toContain('packages/extension/tests/webview/vscodeApi.test.ts');
    expect(includes).not.toContain('packages/extension/tests/webview/**/*.test.ts');
    expect(includes).not.toContain('packages/extension/tests/webview/**/*.test.tsx');
  });

  it('keeps mirrored feature test trees for nested source folders', () => {
    const includes = directIncludes('packages/extension/tests', {
      camelName: 'service',
      directory: 'extension/workspaceAnalyzer',
      dottedRelativePath: 'extension.workspaceAnalyzer.service',
      includeBroadFallback: true,
      name: 'service',
      relativeTestDirectory: 'extension/workspaceAnalyzer/'
    });

    expect(includes).toContain('packages/extension/tests/extension/workspaceAnalyzer/**/*.test.ts');
    expect(includes).toContain('packages/extension/tests/extension/workspaceAnalyzer/**/*.test.tsx');
  });
});
