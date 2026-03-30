import type { ScrapFileMetric } from '../../../src/scrap/types';
import { policyFailureMessage } from '../../../src/scrap/policy/failureMessage';
import {
  hasPolicyViolations,
  hasReviewFirstViolation,
  hasSplitViolation,
} from '../../../src/scrap/policy/violations';

export const STRICT_FAILURE_MESSAGE = policyFailureMessage('strict')!;

export { hasReviewFirstViolation, hasSplitViolation };

export function hasStrictViolations(metrics: ScrapFileMetric[]): boolean {
  return hasPolicyViolations(metrics, 'strict');
}
