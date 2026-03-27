import { describe, expect, it } from 'vitest';
import { countedFingerprintGroups, duplicateGroupCount } from '../../src/scrap/duplicationGroupSizes';
import type { ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function example(overrides: Partial<ScrapExampleMetric> = {}): ScrapExampleMetric {
  return {
    assertionCount: 1,
    blockPath: ['suite'],
    branchCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 0,
    endLine: 5,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name: 'example',
    score: 2,
    setupLineCount: 0,
    startLine: 1,
    ...overrides
  };
}

describe('duplicationGroupSizes', () => {
  it('counts repeated fingerprints and leaves missing fingerprints at zero', () => {
    expect(countedFingerprintGroups([
      example({ exampleFingerprint: 'alpha' }),
      example({ exampleFingerprint: 'alpha' }),
      example({ exampleFingerprint: 'beta' }),
      example()
    ], (metric) => metric.exampleFingerprint)).toEqual([2, 2, 1, 0]);
  });

  it('counts only duplicate group sizes above one', () => {
    expect(duplicateGroupCount([0, 1, 2, 3])).toBe(2);
  });
});
