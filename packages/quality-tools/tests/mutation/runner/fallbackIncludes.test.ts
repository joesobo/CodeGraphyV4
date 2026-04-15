import { describe, expect, it } from 'vitest';
import { fallbackIncludes } from '../../../src/mutation/runner/fallbackIncludes';

describe('fallbackIncludes', () => {
  it('returns no patterns when broad fallback is disabled', () => {
    expect(
      fallbackIncludes('packages/extension/tests', {
        camelName: 'runtime',
        directory: 'extension/graphView/provider',
        dottedRelativePath: 'extension.graphView.provider.runtime',
        includeBroadFallback: false,
        name: 'runtime',
        relativeTestDirectory: 'extension/graphView/provider/'
      })
    ).toEqual([]);
  });

  it('builds the exact fallback include set for source rules', () => {
    expect(
      fallbackIncludes('packages/plugin-csharp/tests', {
        camelName: 'typeUsage',
        directory: 'sources',
        dottedRelativePath: 'sources.type-usage',
        includeBroadFallback: true,
        name: 'type-usage',
        relativeTestDirectory: 'sources/'
      })
    ).toEqual([
      'packages/plugin-csharp/tests/**/type-usage.test.ts',
      'packages/plugin-csharp/tests/**/type-usage.test.tsx',
      'packages/plugin-csharp/tests/**/type-usage.mutations.test.ts',
      'packages/plugin-csharp/tests/**/type-usage.mutations.test.tsx',
      'packages/plugin-csharp/tests/**/type-usage*.test.ts',
      'packages/plugin-csharp/tests/**/type-usage*.test.tsx',
      'packages/plugin-csharp/tests/**/sources.type-usage.test.ts',
      'packages/plugin-csharp/tests/**/sources.type-usage.test.tsx',
      'packages/plugin-csharp/tests/**/sources.type-usage.mutations.test.ts',
      'packages/plugin-csharp/tests/**/sources.type-usage.mutations.test.tsx',
      'packages/plugin-csharp/tests/**/typeUsageRule.test.ts',
      'packages/plugin-csharp/tests/**/typeUsageRule.test.tsx',
      'packages/plugin-csharp/tests/**/ruleDetectors.test.ts',
      'packages/plugin-csharp/tests/**/ruleDetectors.test.tsx',
      'packages/plugin-csharp/tests/**/*Detectors.test.ts',
      'packages/plugin-csharp/tests/**/*Detectors.test.tsx',
      'packages/plugin-csharp/tests/**/type-usage/**/*.test.ts',
      'packages/plugin-csharp/tests/**/type-usage/**/*.test.tsx'
    ]);
  });
});
