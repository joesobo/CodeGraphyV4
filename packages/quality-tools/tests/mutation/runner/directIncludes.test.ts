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
      'packages/extension/tests/extension/graphViewProviderRule.test.tsx'
    ]);
  });
});
