import { describe, expect, it } from 'vitest';
import { analyzeScrapMetric } from './analyzeScrapMetric';

describe('analyzeScrapFile block summaries', () => {
  it('summarizes nested describe blocks', () => {
    const metric = analyzeScrapMetric(`
      describe('outer', () => {
        it('stable outer example', () => {
          expect(true).toBe(true);
        });

        context('inner', () => {
          it('hot inner example', () => {
            if (flag) {
              vi.mock('./thing');
            }
          });
        });
      });
    `);

    expect(metric.blockSummaries).toMatchObject([
      { name: 'inner', path: ['outer', 'inner'], remediationMode: 'LOCAL' },
      { name: 'outer', path: ['outer'], remediationMode: 'LOCAL' }
    ]);
  });
});
