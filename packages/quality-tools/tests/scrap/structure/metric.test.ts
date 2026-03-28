import { describe, expect, it } from 'vitest';
import { summarizeBlock } from '../../../src/scrap/structure/metric';
import { type ScrapExampleMetric } from '../../../src/scrap/types';

function metric(overrides: Partial<ScrapExampleMetric>): ScrapExampleMetric {
  return {
    assertionCount: 2,
    blockPath: ['suite'],
    branchCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 0,
    endLine: 10,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name: 'example',
    score: 3,
    setupLineCount: 0,
    startLine: 7,
    ...overrides
  };
}

describe('summarizeBlock', () => {
  it('computes counts, averages, and remediation mode for a block', () => {
    expect(summarizeBlock(['outer', 'inner'], [
      metric({ blockPath: ['outer', 'inner'], score: 9, branchCount: 1, duplicateSetupGroupSize: 2, helperHiddenLineCount: 5, assertionCount: 1 }),
      metric({ blockPath: ['outer', 'inner'], score: 8, branchCount: 1, duplicateSetupGroupSize: 2, assertionCount: 0 })
    ])).toEqual({
      averageScore: 8.5,
      branchingExampleCount: 2,
      duplicateSetupExampleCount: 2,
      exampleCount: 2,
      helperHiddenExampleCount: 1,
      hotExampleCount: 2,
      lowAssertionExampleCount: 2,
      maxScore: 9,
      name: 'inner',
      path: ['outer', 'inner'],
      remediationMode: 'LOCAL',
      zeroAssertionExampleCount: 1
    });
  });
});
