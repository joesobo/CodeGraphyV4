import { describe, expect, it } from 'vitest';
import { verboseExampleLines, worstExampleLines } from '../../src/scrap/reportExamples';
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

describe('worstExampleLines', () => {
  it('returns an empty list when there are no worst examples', () => {
    expect(worstExampleLines(metric())).toEqual([]);
  });

  it('formats the worst example section', () => {
    expect(worstExampleLines(metric({
      worstExamples: [
        {
          assertionCount: 0,
          blockPath: ['suite'],
          branchCount: 1,
          describeDepth: 1,
          duplicateSetupGroupSize: 2,
          endLine: 10,
          helperCallCount: 1,
          helperHiddenLineCount: 6,
          lineCount: 5,
          mockCount: 1,
          name: 'bad test',
          score: 9,
          setupDepth: 0,
          setupLineCount: 3,
          startLine: 6
        }
      ]
    }))).toEqual([
      '  worst examples:',
      '    - bad test (L6-L10) score=9 assertions=0 branches=1 mocks=1 setup=3 dupes=2 helpers=1 hidden=6'
    ]);
  });
});

describe('verboseExampleLines', () => {
  it('formats verbose example detail', () => {
    expect(verboseExampleLines(metric({
      worstExamples: [
        {
          assertionCount: 1,
          asyncWaitCount: 2,
          blockPath: ['suite'],
          branchCount: 1,
          concurrencyCount: 1,
          describeDepth: 1,
          duplicateSetupGroupSize: 1,
          endLine: 12,
          envMutationCount: 1,
          helperCallCount: 0,
          helperHiddenLineCount: 0,
          fakeTimerCount: 1,
          lineCount: 5,
          mockCount: 0,
          name: 'verbose test',
          score: 9,
          snapshotCount: 2,
          setupDepth: 2,
          setupLineCount: 3,
          startLine: 8,
          tableDriven: true,
          tempResourceCount: 1,
          typeOnlyAssertionCount: 1
        }
      ]
    }))).toEqual([
      '  verbose examples:',
      '    - verbose test tableDriven=true setupDepth=2 tempResources=1 snapshots=2 waits=2 fakeTimers=1 envMutations=1 concurrent=1 typeOnly=1'
    ]);
  });
});
