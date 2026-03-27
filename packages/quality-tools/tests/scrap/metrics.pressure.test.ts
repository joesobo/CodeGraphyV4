import { describe, expect, it } from 'vitest';
import { analyzeScrapMetric } from './analyzeScrapMetric';

describe('analyzeScrapFile pressure', () => {
  it('raises local pressure for zero-assertion branching tests', () => {
    const metric = analyzeScrapMetric(`
      describe('math', () => {
        it('branches without assertions', () => {
          if (Math.random() > 0.5) {
            vi.mock('./thing');
          }
        });
      });
    `);

    expect(metric.remediationMode).toBe('LOCAL');
    expect(metric.zeroAssertionExampleCount).toBe(1);
    expect(metric.branchingExampleCount).toBe(1);
    expect(metric.maxScore).toBeGreaterThanOrEqual(8);
  });

  it('counts examples that hide helper complexity', () => {
    const metric = analyzeScrapMetric(`
      describe('suite', () => {
        function buildValue() {
          return 'value';
        }

        it('uses helper setup', () => {
          expect(buildValue()).toBe('value');
        });
      });
    `);

    expect(metric.helperHiddenExampleCount).toBe(1);
    expect(metric.worstExamples[0]).toMatchObject({
      duplicateSetupGroupSize: 0,
      helperCallCount: 1,
      helperHiddenLineCount: 3,
      setupLineCount: 0
    });
  });
});
