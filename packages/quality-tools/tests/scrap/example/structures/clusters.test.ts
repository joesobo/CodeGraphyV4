import { describe, expect, it } from 'vitest';
import {
  coverageRelevantExamples,
  groupSetupExamples,
  isRepeatedSetupExample,
  strongestSetupCluster
} from '../../../../src/scrap/example/clusters';
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

describe('setupClusters', () => {
  it('recognizes only meaningful repeated setup examples', () => {
    expect(isRepeatedSetupExample(example({ duplicateSetupGroupSize: 2, setupLineCount: 3, setupFingerprint: 'a' }))).toBe(true);
    expect(isRepeatedSetupExample(example({ duplicateSetupGroupSize: 1, setupLineCount: 3, setupFingerprint: 'a' }))).toBe(false);
    expect(isRepeatedSetupExample(example({ duplicateSetupGroupSize: 2, setupLineCount: 1, setupFingerprint: 'a' }))).toBe(false);
    expect(isRepeatedSetupExample(example({ duplicateSetupGroupSize: 2, setupLineCount: 3 }))).toBe(false);
  });

  it('groups repeated setup examples by fingerprint', () => {
    expect(groupSetupExamples([
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'a', setupLineCount: 3 }),
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'a', setupLineCount: 3 }),
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'b', setupLineCount: 3 })
    ])).toHaveLength(2);
  });

  it('returns the strongest repeated setup cluster only', () => {
    const result = strongestSetupCluster([
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'a', setupLineCount: 3 }),
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'a', setupLineCount: 3 }),
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'b', setupLineCount: 3 })
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.setupFingerprint)).toEqual(['a', 'a']);
  });

  it('ignores setup examples that are too small or missing a fingerprint', () => {
    expect(strongestSetupCluster([
      example({ duplicateSetupGroupSize: 2, setupLineCount: 1, setupFingerprint: 'a' }),
      example({ duplicateSetupGroupSize: 2, setupLineCount: 3 })
    ])).toEqual([]);
  });

  it('returns the examples relevant to coverage-matrix recommendations', () => {
    expect(coverageRelevantExamples([
      example({ name: 'table', tableDriven: true }),
      example({ literalShapeFingerprint: 'literal', name: 'literal' }),
      example({ fixtureFingerprint: 'fixture', name: 'fixture' }),
      example({ name: 'ignored' })
    ]).map((item) => item.name)).toEqual(['table', 'literal', 'fixture']);
  });
});
