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
  if (policy === 'advisory') {
    return false;
  }

  if (policy === 'split') {
    return metrics.some(hasSplitViolation);
  }

  if (policy === 'review') {
    return metrics.some(hasReviewFirstViolation);
  }

  if (policy !== 'strict') {
    return false;
  }

  return metrics.some(hasSplitViolation) || metrics.some(hasReviewFirstViolation);
}
