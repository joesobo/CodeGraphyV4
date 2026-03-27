import { describe, expect, it } from 'vitest';
import { summaryLines } from '../../src/scrap/reportSummary';
import type { ScrapFileMetric } from '../../src/scrap/scrapTypes';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
    return {
      aiActionability: 'AUTO_REFACTOR',
      averageScore: 4.2,
      asyncWaitExampleCount: 1,
      blockSummaries: [],
      branchingExampleCount: 1,
      concurrencyExampleCount: 1,
      coverageMatrixCandidateCount: 2,
      duplicateSetupExampleCount: 1,
      exampleCount: 2,
      extractionPressureScore: 3,
      filePath: '/repo/packages/example/tests/file.test.ts',
      fakeTimerExampleCount: 1,
      helperHiddenExampleCount: 1,
      envMutationExampleCount: 1,
      lowAssertionExampleCount: 1,
      maxScore: 9,
      remediationMode: 'LOCAL',
      snapshotExampleCount: 2,
      tempResourceExampleCount: 1,
      typeOnlyAssertionExampleCount: 1,
      validationIssues: [{ kind: 'nested-test', line: 9, message: 'Nested test call.' }],
      worstExamples: [],
      zeroAssertionExampleCount: 1,
    ...overrides
  };
}

describe('summaryLines', () => {
  it('prints the metric summary lines', () => {
    expect(summaryLines(metric(), '/repo')).toEqual([
      '\npackages/example/tests/file.test.ts',
      '  mode: LOCAL',
      '  examples: 2',
      '  avg/max: 4.2 / 9',
      '  actionability: AUTO_REFACTOR',
      '  zero-assertion: 1',
      '  low-assertion: 1',
      '  branching: 1',
      '  duplicate-setup: 1',
      '  helper-hidden: 1',
      '  coverage-matrix: 2',
      '  extraction-pressure: 3',
      '  subjects: 0',
      '  subject-overlap: 0',
      '  shape-diversity: 0',
      '  vitest-signals: snapshots=2 waits=1 fake-timers=1 env/global=1 concurrent=1 type-only=1',
      '  temp-resources: 1',
      '  validation-issues: 1'
    ]);
  });

  it('defaults optional summary fields to zero or leave-alone', () => {
    expect(summaryLines(metric({
      aiActionability: undefined,
      coverageMatrixCandidateCount: undefined,
      extractionPressureScore: undefined,
      snapshotExampleCount: undefined,
      tempResourceExampleCount: undefined,
      validationIssues: undefined
    }), '/repo')).toContain('  actionability: LEAVE_ALONE');
    expect(summaryLines(metric({
      aiActionability: undefined,
      coverageMatrixCandidateCount: undefined,
      extractionPressureScore: undefined,
      snapshotExampleCount: undefined,
      tempResourceExampleCount: undefined,
      validationIssues: undefined
    }), '/repo')).toContain('  coverage-matrix: 0');
  });
});
