import { describe, expect, it } from 'vitest';
import { comparisonLines } from '../../src/scrap/reportComparison';
import type { ScrapFileMetric } from '../../src/scrap/scrapTypes';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    averageScore: 1,
    blockSummaries: [],
    branchingExampleCount: 0,
    duplicateSetupExampleCount: 0,
    exampleCount: 1,
    filePath: '/repo/file.test.ts',
    helperHiddenExampleCount: 0,
    lowAssertionExampleCount: 0,
    maxScore: 1,
    remediationMode: 'STABLE',
    worstExamples: [],
    zeroAssertionExampleCount: 0,
    ...overrides
  };
}

describe('comparisonLines', () => {
  it('returns an empty list when there is no comparison', () => {
    expect(comparisonLines(metric())).toEqual([]);
  });

  it('formats the comparison summary line', () => {
    expect(comparisonLines(metric({
      comparison: {
        averageScoreDelta: -1,
        coverageMatrixDelta: 1,
        extractionPressureDelta: 2,
        harmfulDuplicationDelta: 1,
        helperHiddenDelta: 0,
        maxScoreDelta: -2,
        verdict: 'mixed'
      }
    }))).toEqual([
      '  compare: mixed avgΔ=-1 maxΔ=-2 extractΔ=2 matrixΔ=1 dupΔ=1 helperΔ=0'
    ]);
  });
});
