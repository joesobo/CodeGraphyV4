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
      fallbackIncludes('packages/plugin-csharp/__tests__', {
        camelName: 'typeUsage',
        directory: 'sources',
        dottedRelativePath: 'sources.type-usage',
        includeBroadFallback: true,
        name: 'type-usage',
        relativeTestDirectory: 'sources/'
      })
    ).toEqual([
      'packages/plugin-csharp/__tests__/**/type-usage.test.ts',
      'packages/plugin-csharp/__tests__/**/type-usage.test.tsx',
      'packages/plugin-csharp/__tests__/**/type-usage.mutations.test.ts',
      'packages/plugin-csharp/__tests__/**/type-usage.mutations.test.tsx',
      'packages/plugin-csharp/__tests__/**/type-usage*.test.ts',
      'packages/plugin-csharp/__tests__/**/type-usage*.test.tsx',
      'packages/plugin-csharp/__tests__/**/sources.type-usage.test.ts',
      'packages/plugin-csharp/__tests__/**/sources.type-usage.test.tsx',
      'packages/plugin-csharp/__tests__/**/sources.type-usage.mutations.test.ts',
      'packages/plugin-csharp/__tests__/**/sources.type-usage.mutations.test.tsx',
      'packages/plugin-csharp/__tests__/**/typeUsageRule.test.ts',
      'packages/plugin-csharp/__tests__/**/typeUsageRule.test.tsx',
      'packages/plugin-csharp/__tests__/**/ruleDetectors.test.ts',
      'packages/plugin-csharp/__tests__/**/ruleDetectors.test.tsx',
      'packages/plugin-csharp/__tests__/**/*Detectors.test.ts',
      'packages/plugin-csharp/__tests__/**/*Detectors.test.tsx',
      'packages/plugin-csharp/__tests__/**/type-usage/**/*.test.ts',
      'packages/plugin-csharp/__tests__/**/type-usage/**/*.test.tsx'
    ]);
  });
});
