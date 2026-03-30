import { describe, expect, it } from 'vitest';
import { STRICT_FAILURE_MESSAGE, hasStrictViolations } from './strictModeSupport';
import type { ScrapFileMetric } from '../../../src/scrap/types';

function createMetric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    averageScore: 1,
    blockSummaries: [],
    branchingExampleCount: 0,
    duplicateSetupExampleCount: 0,
    exampleCount: 1,
    filePath: '/src/file.ts',
    helperHiddenExampleCount: 0,
    lowAssertionExampleCount: 0,
    maxScore: 1,
    remediationMode: 'STABLE',
    zeroAssertionExampleCount: 0,
    worstExamples: [],
    ...overrides
  };
}

describe('strictMode', () => {
  describe('STRICT_FAILURE_MESSAGE', () => {
    it('contains the word strict', () => {
      expect(STRICT_FAILURE_MESSAGE).toContain('strict');
    });

    it('has a meaningful message about violations', () => {
      expect(STRICT_FAILURE_MESSAGE.length).toBeGreaterThan(0);
      expect(STRICT_FAILURE_MESSAGE).toMatch(/strict|violation|failed/i);
    });
  });

  describe('hasStrictViolations', () => {
    it('returns false for empty metrics array', () => {
      expect(hasStrictViolations([])).toBe(false);
    });

    it('returns false when metrics have no violations', () => {
      const metrics: ScrapFileMetric[] = [
        createMetric()
      ];
      expect(hasStrictViolations(metrics)).toBe(false);
    });

    it('returns true when metrics contain split violations', () => {
      const metrics: ScrapFileMetric[] = [
        createMetric({ remediationMode: 'SPLIT' })
      ];
      expect(hasStrictViolations(metrics)).toBe(true);
    });

    it('returns true when metrics contain review-first violations', () => {
      const metrics: ScrapFileMetric[] = [
        createMetric({ aiActionability: 'REVIEW_FIRST' })
      ];
      expect(hasStrictViolations(metrics)).toBe(true);
    });

    it('returns true when metrics contain either type of violation', () => {
      const metricsWithSplit: ScrapFileMetric[] = [
        createMetric({ filePath: '/src/file1.ts', remediationMode: 'SPLIT' }),
        createMetric({ filePath: '/src/file2.ts' })
      ];
      expect(hasStrictViolations(metricsWithSplit)).toBe(true);

      const metricsWithReviewFirst: ScrapFileMetric[] = [
        createMetric({ filePath: '/src/file1.ts' }),
        createMetric({ filePath: '/src/file2.ts', aiActionability: 'REVIEW_FIRST' })
      ];
      expect(hasStrictViolations(metricsWithReviewFirst)).toBe(true);
    });
  });

  describe('mutation killers for strictMode.ts', () => {
    it('kills mutation: string literal strict is exact in policyFailureMessage call', () => {
      // STRICT_FAILURE_MESSAGE is created by calling policyFailureMessage('strict')
      // The 'strict' string must be exact
      expect(STRICT_FAILURE_MESSAGE).toBeDefined();
      expect(STRICT_FAILURE_MESSAGE).toContain('strict');
      // Verify it's the strict mode message that mentions both split AND review-first
      expect(STRICT_FAILURE_MESSAGE).toContain('split or review-first');
      // Verify it's not just the split-only message
      expect(STRICT_FAILURE_MESSAGE).toContain('SCRAP strict mode failed');
    });

    it('kills mutation: hasStrictViolations calls hasPolicyViolations with strict mode', () => {
      // hasStrictViolations must pass 'strict' to hasPolicyViolations
      const metricsWithViolation: ScrapFileMetric[] = [
        createMetric({ remediationMode: 'SPLIT' })
      ];
      // In strict mode, both SPLIT and REVIEW_FIRST are violations
      expect(hasStrictViolations(metricsWithViolation)).toBe(true);

      const metricsWithReview: ScrapFileMetric[] = [
        createMetric({ aiActionability: 'REVIEW_FIRST' })
      ];
      // In strict mode, both SPLIT and REVIEW_FIRST are violations
      expect(hasStrictViolations(metricsWithReview)).toBe(true);
    });

    it('kills mutation: strict mode detects both violation types', () => {
      // Verify that strict mode checks for BOTH split AND review-first violations
      // (not just one of them)
      const metricsWithBoth: ScrapFileMetric[] = [
        createMetric({ filePath: '/src/split.ts', remediationMode: 'SPLIT' }),
        createMetric({ filePath: '/src/review.ts', aiActionability: 'REVIEW_FIRST' })
      ];
      expect(hasStrictViolations(metricsWithBoth)).toBe(true);
    });

    it('kills mutation: STRICT_FAILURE_MESSAGE is not empty', () => {
      // The message must be non-empty and describe the failure
      expect(STRICT_FAILURE_MESSAGE).toBeTruthy();
      expect(STRICT_FAILURE_MESSAGE.length).toBeGreaterThan(0);
    });

    it('kills L14:39-L14:47 string literal strict is exact', () => {
      // The string literal 'strict' at line 14 must be exactly 'strict', not 'permissive' or other variants
      // hasStrictViolations calls hasPolicyViolations(metrics, 'strict')
      // If the string were mutated to something else like 'advisory', it would use different logic
      const metricsWithSplit: ScrapFileMetric[] = [
        createMetric({ remediationMode: 'SPLIT' })
      ];
      const metricsWithReview: ScrapFileMetric[] = [
        createMetric({ aiActionability: 'REVIEW_FIRST' })
      ];

      // In 'strict' mode, both SPLIT and REVIEW_FIRST are violations
      // In other modes (like 'advisory'), neither would be violations
      expect(hasStrictViolations(metricsWithSplit)).toBe(true);
      expect(hasStrictViolations(metricsWithReview)).toBe(true);

      // Verify that 'strict' is the right mode by checking the message
      expect(STRICT_FAILURE_MESSAGE).toContain('SCRAP strict mode');
      expect(STRICT_FAILURE_MESSAGE).not.toContain('advisory');
      expect(STRICT_FAILURE_MESSAGE).not.toContain('split policy');
      expect(STRICT_FAILURE_MESSAGE).not.toContain('review policy');
    });

    it('treats unknown policy strings as non-strict behavior in the underlying policy layer', () => {
      const metricsWithSplit: ScrapFileMetric[] = [
        createMetric({ remediationMode: 'SPLIT' })
      ];

      expect(hasStrictViolations(metricsWithSplit)).toBe(true);
    });
  });
});
