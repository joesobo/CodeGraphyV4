import { type ScrapFileMetric } from '../types';
import { type ScrapPolicyPreset } from './resolve';

export function hasSplitViolation(metric: ScrapFileMetric): boolean {
  return metric.remediationMode === 'SPLIT';
}

export function hasReviewFirstViolation(metric: ScrapFileMetric): boolean {
  return metric.aiActionability === 'REVIEW_FIRST';
}

export function hasPolicyViolations(
  metrics: ScrapFileMetric[],
  policy: ScrapPolicyPreset
): boolean {
  switch (policy) {
    case 'split':
      return metrics.some(hasSplitViolation);
    case 'review':
      return metrics.some(hasReviewFirstViolation);
    case 'strict':
      return metrics.some(hasSplitViolation) || metrics.some(hasReviewFirstViolation);
    case 'advisory':
    default:
      return false;
  }
}
