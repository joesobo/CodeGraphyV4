import { describe, expect, it } from 'vitest';
import { summarizeExampleCounts } from '../../src/scrap/exampleCountSummary';
import type { ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function example(overrides: Partial<ScrapExampleMetric> = {}): ScrapExampleMetric {
  return {
    assertionCount: 2,
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

describe('exampleCountSummary', () => {
  it('summarizes branching, setup, assertion, table, and temp-resource counts', () => {
    expect(summarizeExampleCounts([
      example({ assertionCount: 0, branchCount: 1, duplicateSetupGroupSize: 2, helperHiddenLineCount: 4, tableDriven: true, tempResourceCount: 1 }),
      example({ assertionCount: 1, duplicateSetupGroupSize: 0, tempResourceCount: 0 }),
      example({ assertionCount: 2, duplicateSetupGroupSize: 3 })
    ])).toEqual({
      branchingExampleCount: 1,
      duplicateSetupGroupSizes: [2, 0, 3],
      helperHiddenExampleCount: 1,
      lowAssertionExampleCount: 2,
      tableDrivenExampleCount: 1,
      tempResourceExampleCount: 1,
      zeroAssertionExampleCount: 1
    });
  });
});
