import { type ScrapFileMetric } from './metrics';
import {
  hasPolicyViolations,
  hasReviewFirstViolation,
  hasSplitViolation,
  policyFailureMessage
} from './scrapPolicy';

export const STRICT_FAILURE_MESSAGE = policyFailureMessage('strict')!;

export { hasReviewFirstViolation, hasSplitViolation };

export function hasStrictViolations(metrics: ScrapFileMetric[]): boolean {
  return hasPolicyViolations(metrics, 'strict');
}
