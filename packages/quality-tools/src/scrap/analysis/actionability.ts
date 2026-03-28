import { type ScrapAiActionability, type ScrapFileMetric } from '../types';

function hasValidationIssues(metric: ScrapFileMetric): boolean {
  return (metric.validationIssues?.length ?? 0) > 0;
}

function needsManualSplit(metric: ScrapFileMetric): boolean {
  return metric.remediationMode === 'SPLIT';
}

function shouldTableDrive(metric: ScrapFileMetric): boolean {
  return (metric.coverageMatrixCandidateCount ?? 0) > 0 &&
    (metric.extractionPressureScore ?? 0) === 0;
}

function shouldRefactorLocally(metric: ScrapFileMetric): boolean {
  return metric.remediationMode === 'LOCAL';
}

export function aiActionability(metric: ScrapFileMetric): ScrapAiActionability {
  if (hasValidationIssues(metric)) {
    return 'REVIEW_FIRST';
  }

  if (needsManualSplit(metric)) {
    return 'MANUAL_SPLIT';
  }

  if (shouldTableDrive(metric)) {
    return 'AUTO_TABLE_DRIVE';
  }

  if (shouldRefactorLocally(metric)) {
    return 'AUTO_REFACTOR';
  }

  return 'LEAVE_ALONE';
}
