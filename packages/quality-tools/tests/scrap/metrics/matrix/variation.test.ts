import { describe, expect, it } from 'vitest';
import { hasStructuredVariation } from '../../../../src/scrap/metrics/matrix/variation';
import type { ScrapExampleMetric } from '../../../../src/scrap/types';

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

describe('coverageMatrixVariation', () => {
  it('recognizes table-driven examples as structured variation', () => {
    expect(hasStructuredVariation(example({ tableDriven: true }), 0, 0)).toBe(true);
  });

  it('requires repeated literal or fixture groups for non-table-driven examples', () => {
    expect(hasStructuredVariation(example(), 0, 0)).toBe(false);
    expect(hasStructuredVariation(example(), 1, 0)).toBe(false);
    expect(hasStructuredVariation(example(), 0, 1)).toBe(false);
    expect(hasStructuredVariation(example(), 2, 0)).toBe(true);
    expect(hasStructuredVariation(example(), 0, 2)).toBe(true);
  });
});
