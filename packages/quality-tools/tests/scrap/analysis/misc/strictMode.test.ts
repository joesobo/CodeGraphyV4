import { describe, expect, it } from 'vitest';
import {
  hasReviewFirstViolation,
  hasSplitViolation,
  hasStrictViolations,
  STRICT_FAILURE_MESSAGE
} from '../../policy/strictModeSupport';
import type { ScrapFileMetric } from '../../../../src/scrap/analysis/metrics';
import { createMetrics } from '../../test/run/support';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    ...createMetrics()[0],
    ...overrides
  };
}

describe('scrapStrictMode', () => {
  it('detects split violations independently', () => {
    expect(hasSplitViolation(metric({ remediationMode: 'SPLIT' }))).toBe(true);
    expect(hasSplitViolation(metric({ remediationMode: 'LOCAL' }))).toBe(false);
  });

  it('detects review-first violations independently', () => {
    expect(hasReviewFirstViolation(metric({ aiActionability: 'REVIEW_FIRST' }))).toBe(true);
    expect(hasReviewFirstViolation(metric({ aiActionability: 'AUTO_REFACTOR' }))).toBe(false);
  });

  it('reports strict violations for split and review-first files', () => {
    expect(hasStrictViolations([
      metric({ remediationMode: 'STABLE' }),
      metric({ aiActionability: 'REVIEW_FIRST', remediationMode: 'LOCAL' }),
      metric({ remediationMode: 'SPLIT' })
    ])).toBe(true);
  });

  it('reports strict violations for split-only files', () => {
    expect(hasStrictViolations([
      metric({ remediationMode: 'SPLIT' })
    ])).toBe(true);
  });

  it('reports strict violations for review-first-only files', () => {
    expect(hasStrictViolations([
      metric({ aiActionability: 'REVIEW_FIRST', remediationMode: 'LOCAL' })
    ])).toBe(true);
  });

  it('returns false when metrics are safe for strict mode', () => {
    expect(hasStrictViolations([
      metric({ aiActionability: 'LEAVE_ALONE', remediationMode: 'STABLE' }),
      metric({ aiActionability: 'AUTO_REFACTOR', remediationMode: 'LOCAL' })
    ])).toBe(false);
  });

  it('exports the strict failure message', () => {
    expect(STRICT_FAILURE_MESSAGE).toBe('SCRAP strict mode failed: split or review-first files are present.');
  });
});
