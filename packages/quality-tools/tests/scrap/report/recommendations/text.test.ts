import { describe, expect, it } from 'vitest';
import { recommendationLines } from '../../../../src/scrap/report/blocks/recommendations';
import type { ScrapFileMetric } from '../../../../src/scrap/types';

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

describe('recommendationLines', () => {
  it('returns an empty list when there are no recommendations', () => {
    expect(recommendationLines(metric())).toEqual([]);
    expect(recommendationLines(metric({ recommendations: [] }))).toEqual([]);
  });

  it('formats recommendation lines', () => {
    expect(recommendationLines(metric({
      recommendations: [
        {
          confidence: 'HIGH',
          kind: 'TABLE_DRIVE',
          message: '1 example(s) look like a coverage matrix that should be table-driven.'
        }
      ]
    }))).toEqual([
      '  recommendations:',
      '    - TABLE_DRIVE confidence=HIGH 1 example(s) look like a coverage matrix that should be table-driven.'
    ]);
  });
});
