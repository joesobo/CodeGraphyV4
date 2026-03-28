import { describe, expect, it } from 'vitest';
import { hotBlockLines } from '../../../../src/scrap/report/blocks/format';
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

describe('hotBlockLines', () => {
  it('returns an empty list when there are no interesting blocks', () => {
    expect(hotBlockLines(metric())).toEqual([]);
  });

  it('formats up to five non-stable block summaries', () => {
    const lines = hotBlockLines(metric({
      blockSummaries: [
        { averageScore: 9, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 9, name: 'a', path: ['suite', 'a'], recommendedExtractionCount: 1, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
        { averageScore: 8, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 8, name: 'b', path: ['suite', 'b'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
        { averageScore: 7, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 7, name: 'c', path: ['suite', 'c'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
        { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 0, lowAssertionExampleCount: 0, maxScore: 6, name: 'stable', path: ['suite', 'stable'], recommendedExtractionCount: 0, remediationMode: 'STABLE', zeroAssertionExampleCount: 0 },
        { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 6, name: 'd', path: ['suite', 'd'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
        { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 6, name: 'e', path: ['suite', 'e'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
        { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 6, name: 'f', path: ['suite', 'f'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 }
      ]
    }));

    expect(lines).toEqual([
      '  hot blocks:',
      '    - suite > a mode=LOCAL examples=1 avg/max=9 / 9 hot=1 dupes=0 helpers=0 extract=1',
      '    - suite > b mode=LOCAL examples=1 avg/max=8 / 8 hot=1 dupes=0 helpers=0 extract=0',
      '    - suite > c mode=LOCAL examples=1 avg/max=7 / 7 hot=1 dupes=0 helpers=0 extract=0',
      '    - suite > d mode=LOCAL examples=1 avg/max=6 / 6 hot=1 dupes=0 helpers=0 extract=0',
      '    - suite > e mode=LOCAL examples=1 avg/max=6 / 6 hot=1 dupes=0 helpers=0 extract=0'
    ]);
  });
});
