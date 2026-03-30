import { describe, expect, it } from 'vitest';
import { summarizeBlocks } from '../../../src/scrap/structure/summaries';
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

describe('summarizeBlocks', () => {
  it('builds summaries for nested describe paths and parent prefixes', () => {
    const summaries = summarizeBlocks([
      metric({ blockPath: ['outer'], name: 'a', score: 4 }),
      metric({ assertionCount: 1, blockPath: ['outer', 'inner'], branchCount: 1, duplicateSetupGroupSize: 2, helperHiddenLineCount: 5, name: 'b', score: 9 }),
      metric({ assertionCount: 0, blockPath: ['outer', 'inner'], branchCount: 1, duplicateSetupGroupSize: 2, name: 'c', score: 8 }),
      metric({ blockPath: [], name: 'top-level', score: 7 })
    ]);

    expect(summaries).toEqual([
      {
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
      },
      {
        averageScore: 7,
        branchingExampleCount: 2,
        duplicateSetupExampleCount: 2,
        exampleCount: 3,
        helperHiddenExampleCount: 1,
        hotExampleCount: 2,
        lowAssertionExampleCount: 2,
        maxScore: 9,
        name: 'outer',
        path: ['outer'],
        remediationMode: 'LOCAL',
        zeroAssertionExampleCount: 1
      }
    ]);
  });

  it('returns no block summaries for ungrouped top-level tests', () => {
    expect(summarizeBlocks([
      metric({ blockPath: [], name: 'top-level' })
    ])).toEqual([]);
  });
});
