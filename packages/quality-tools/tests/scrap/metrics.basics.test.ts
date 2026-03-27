import { describe, expect, it } from 'vitest';
import { analyzeScrapMetric } from './analyzeScrapMetric';

describe('analyzeScrapFile basics', () => {
  it('returns zeroed metrics when a file has no examples', () => {
    expect(analyzeScrapMetric(`describe('suite', () => {});`)).toMatchObject({
      averageScore: 0,
      branchingExampleCount: 0,
      blockSummaries: [],
      duplicateSetupExampleCount: 0,
      exampleCount: 0,
      helperHiddenExampleCount: 0,
      lowAssertionExampleCount: 0,
      maxScore: 0,
      remediationMode: 'STABLE',
      worstExamples: [],
      zeroAssertionExampleCount: 0
    });
  });

  it('marks small well-asserted tests as stable', () => {
    const metric = analyzeScrapMetric(`
      describe('math', () => {
        it('adds values', () => {
          expect(1 + 1).toBe(2);
        });
      });
    `);

    expect(metric.remediationMode).toBe('STABLE');
    expect(metric.duplicateSetupExampleCount).toBe(0);
    expect(metric.exampleCount).toBe(1);
    expect(metric.helperHiddenExampleCount).toBe(0);
    expect(metric.zeroAssertionExampleCount).toBe(0);
  });
});
