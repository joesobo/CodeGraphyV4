import { type ScrapFileMetric } from '../types';
import {
  hasPolicyViolations,
  hasReviewFirstViolation,
  hasSplitViolation
} from './violations';
import { policyFailureMessage } from './failureMessage';

export const STRICT_FAILURE_MESSAGE = policyFailureMessage('strict')!;

export { hasReviewFirstViolation, hasSplitViolation };

export function hasStrictViolations(metrics: ScrapFileMetric[]): boolean {
  return hasPolicyViolations(metrics, 'strict');
}
