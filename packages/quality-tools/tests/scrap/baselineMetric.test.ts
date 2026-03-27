import { describe, expect, it } from 'vitest';
import { comparisonForMetric } from '../../src/scrap/baselineMetric';
import type { ScrapFileMetric } from '../../src/scrap/scrapTypes';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    averageScore: 4,
    blockSummaries: [],
    branchingExampleCount: 0,
    coverageMatrixCandidateCount: 1,
    duplicateSetupExampleCount: 0,
    exampleCount: 1,
    extractionPressureScore: 2,
    filePath: '/repo/file.test.ts',
    harmfulDuplicationScore: 2,
    helperHiddenExampleCount: 1,
    lowAssertionExampleCount: 0,
    maxScore: 6,
    remediationMode: 'LOCAL',
    worstExamples: [],
    zeroAssertionExampleCount: 0,
    ...overrides
  };
}

describe('comparisonForMetric', () => {
  it('returns undefined when no previous baseline exists', () => {
    expect(comparisonForMetric(metric(), undefined)).toBeUndefined();
  });

  it('defaults missing baseline values to zero before comparing', () => {
    expect(comparisonForMetric(metric(), { filePath: '/repo/file.test.ts' })).toEqual({
      averageScoreDelta: 4,
      coverageMatrixDelta: 1,
      extractionPressureDelta: 2,
      harmfulDuplicationDelta: 2,
      helperHiddenDelta: 1,
      maxScoreDelta: 6,
      verdict: 'worse'
    });
  });
});
