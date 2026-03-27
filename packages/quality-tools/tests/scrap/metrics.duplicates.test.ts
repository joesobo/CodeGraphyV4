import { describe, expect, it } from 'vitest';
import { analyzeScrapMetric } from './analyzeScrapMetric';

describe('analyzeScrapFile duplicate setup pressure', () => {
  it('raises local pressure when several examples repeat the same setup', () => {
    const metric = analyzeScrapMetric(`
      describe('suite', () => {
        it('a', () => {
          const value = createValue('a');
          vi.mock('./alpha');
          expect(value).toBeDefined();
        });

        it('b', () => {
          const result = createValue('b');
          vi.mock('./beta');
          expect(result).toBeDefined();
        });
      });
    `);

    expect(metric.duplicateSetupExampleCount).toBe(2);
    expect(metric.worstExamples[0]).toMatchObject({
      duplicateSetupGroupSize: 2,
      setupLineCount: 2
    });
    expect(metric.remediationMode).toBe('LOCAL');
  });

  it('raises split pressure when multiple hotspots exist in one file', () => {
    const metric = analyzeScrapMetric(`
      describe('suite', () => {
        it('a', () => { if (flag) { vi.mock('./a'); } });
        it('b', () => { if (flag) { vi.mock('./b'); } });
        it('c', () => { if (flag) { vi.mock('./c'); } });
      });
    `);

    expect(metric.remediationMode).toBe('SPLIT');
  });

  it('recommends structure review when one file mixes unrelated subjects', () => {
    const metric = analyzeScrapMetric(`
      describe('suite', () => {
        it('loads graph', () => {
          graphService.load();
          expect(result).toBeDefined();
        });

        it('toggles settings', () => {
          settingsStore.toggle();
          expect(result).toBeDefined();
        });

        it('syncs timeline', () => {
          timelineService.sync();
          expect(result).toBeDefined();
        });

        it('renders view', () => {
          renderPanel();
          expect(result).toBeDefined();
        });
      });
    `);

    expect(metric.distinctSubjectCount).toBe(4);
    expect(metric.averageSubjectOverlap).toBe(0);
    expect(metric.exampleShapeDiversity).toBe(1);
    expect(metric.recommendations).toContainEqual({
      confidence: 'LOW',
      kind: 'REVIEW_STRUCTURE',
      message: 'Examples touch 4 distinct subjects with little overlap. Review whether this file mixes responsibilities.'
    });
  });
});
