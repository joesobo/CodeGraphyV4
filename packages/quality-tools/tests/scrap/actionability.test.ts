import { describe, expect, it } from 'vitest';
import { aiActionability } from '../../src/scrap/actionability';
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

describe('aiActionability', () => {
  it('uses review-first when validation issues exist', () => {
    expect(aiActionability(metric({
      validationIssues: [{ kind: 'parse', line: 1, message: 'broken' }]
    }))).toBe('REVIEW_FIRST');
  });

  it('uses manual split for split-level file pressure', () => {
    expect(aiActionability(metric({ remediationMode: 'SPLIT' }))).toBe('MANUAL_SPLIT');
  });

  it('prefers auto table-drive for clean matrix candidates', () => {
    expect(aiActionability(metric({
      coverageMatrixCandidateCount: 2,
      extractionPressureScore: 0,
      remediationMode: 'LOCAL'
    }))).toBe('AUTO_TABLE_DRIVE');
  });

  it('uses auto refactor for local cleanup pressure', () => {
    expect(aiActionability(metric({ remediationMode: 'LOCAL' }))).toBe('AUTO_REFACTOR');
  });

  it('leaves stable files alone by default', () => {
    expect(aiActionability(metric())).toBe('LEAVE_ALONE');
  });
});
