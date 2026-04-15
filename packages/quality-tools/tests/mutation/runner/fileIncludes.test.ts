import { describe, expect, it } from 'vitest';
import { fileIncludes } from '../../../src/mutation/runner/fileIncludes';

describe('fileIncludes', () => {
  it('includes mirrored and broad fallback globs for ordinary source files', () => {
    const includes = fileIncludes('extension', 'extension/graphViewProvider.ts');

    expect(includes).toContain('packages/extension/tests/extension/graphViewProvider.test.ts');
    expect(includes).toContain('packages/extension/tests/**/graphViewProvider*.test.ts');
    expect(includes).toContain('packages/extension/tests/**/graphViewProvider/**/*.test.ts');
  });

  it('skips broad fallback globs for generic basenames', () => {
    const includes = fileIncludes('extension', 'extension/graphView/provider/runtime.ts');

    expect(includes).toContain('packages/extension/tests/extension/graphView/provider/runtime.test.ts');
    expect(includes).not.toContain('packages/extension/tests/**/runtime.test.ts');
    expect(includes).not.toContain('packages/extension/tests/**/runtime/**/*.test.ts');
  });

  it('includes detector and camel-cased rule tests for source rules', () => {
    const includes = fileIncludes('plugin-csharp', 'sources/type-usage.ts');

    expect(includes).toContain('packages/plugin-csharp/tests/sources/typeUsageRule.test.ts');
    expect(includes).toContain('packages/plugin-csharp/tests/**/ruleDetectors.test.ts');
    expect(includes).toContain('packages/plugin-csharp/tests/**/*Detectors.test.tsx');
  });
});
