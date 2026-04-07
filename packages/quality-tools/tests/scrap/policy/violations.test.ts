import { describe, expect, it } from 'vitest';
import {
  hasPolicyViolations,
  hasReviewFirstViolation,
  hasSplitViolation,
} from '../../../src/scrap/policy/violations';
import type { ScrapFileMetric } from '../../../src/scrap/types';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    averageScore: 1,
    blockSummaries: [],
    branchingExampleCount: 0,
    duplicateSetupExampleCount: 0,
    exampleCount: 1,
    filePath: '/src/file.test.ts',
    helperHiddenExampleCount: 0,
    lowAssertionExampleCount: 0,
    maxScore: 1,
    remediationMode: 'STABLE',
    zeroAssertionExampleCount: 0,
    worstExamples: [],
    ...overrides,
  };
}

describe('scrap/policy/violations', () => {
  it('detects split violations only for split remediation mode', () => {
    expect(hasSplitViolation(metric({ remediationMode: 'SPLIT' }))).toBe(true);
    expect(hasSplitViolation(metric({ remediationMode: 'LOCAL' }))).toBe(false);
    expect(hasSplitViolation(metric({ remediationMode: 'STABLE' }))).toBe(false);
  });

  it('detects review-first violations only for review-first actionability', () => {
    expect(hasReviewFirstViolation(metric({ aiActionability: 'REVIEW_FIRST' }))).toBe(true);
    expect(hasReviewFirstViolation(metric({ aiActionability: 'AUTO_REFACTOR' }))).toBe(false);
    expect(hasReviewFirstViolation(metric())).toBe(false);
  });

  it('keeps advisory policy non-failing even when violations exist', () => {
    expect(hasPolicyViolations([
      metric({ remediationMode: 'SPLIT' }),
      metric({ aiActionability: 'REVIEW_FIRST' }),
    ], 'advisory')).toBe(false);
  });

  it('fails split policy only when split metrics exist', () => {
    expect(hasPolicyViolations([
      metric({ remediationMode: 'LOCAL' }),
      metric({ remediationMode: 'SPLIT' }),
    ], 'split')).toBe(true);
    expect(hasPolicyViolations([
      metric({ aiActionability: 'REVIEW_FIRST' }),
      metric({ remediationMode: 'LOCAL' }),
    ], 'split')).toBe(false);
  });

  it('fails review policy only when review-first metrics exist', () => {
    expect(hasPolicyViolations([
      metric({ aiActionability: 'REVIEW_FIRST' }),
      metric({ remediationMode: 'STABLE' }),
    ], 'review')).toBe(true);
    expect(hasPolicyViolations([
      metric({ remediationMode: 'SPLIT' }),
      metric({ remediationMode: 'LOCAL' }),
    ], 'review')).toBe(false);
  });

  it('fails strict policy for either split or review-first metrics', () => {
    expect(hasPolicyViolations([
      metric({ remediationMode: 'SPLIT' }),
    ], 'strict')).toBe(true);
    expect(hasPolicyViolations([
      metric({ aiActionability: 'REVIEW_FIRST' }),
    ], 'strict')).toBe(true);
    expect(hasPolicyViolations([
      metric({ remediationMode: 'LOCAL' }),
      metric({ remediationMode: 'SPLIT' }),
    ], 'strict')).toBe(true);
    expect(hasPolicyViolations([
      metric({ aiActionability: 'AUTO_TABLE_DRIVE' }),
      metric({ aiActionability: 'REVIEW_FIRST' }),
    ], 'strict')).toBe(true);
    expect(hasPolicyViolations([
      metric({ remediationMode: 'LOCAL' }),
      metric({ aiActionability: 'AUTO_TABLE_DRIVE' }),
    ], 'strict')).toBe(false);
  });

  it('treats unknown policies as non-failing', () => {
    expect(hasPolicyViolations([
      metric({ remediationMode: 'SPLIT' }),
      metric({ aiActionability: 'REVIEW_FIRST' }),
    ], 'custom' as never)).toBe(false);
  });
});
