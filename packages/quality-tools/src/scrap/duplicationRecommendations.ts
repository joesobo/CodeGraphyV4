import { type ScrapExampleMetric } from './scrapTypes';
import { type ScrapRecommendation } from './scrapTypes';
import { summarizeBlockPaths, summarizeHelperGroups } from './recommendationText';
import { coverageRelevantExamples, strongestSetupCluster } from './setupClusters';

interface DuplicationRecommendationCounts {
  coverageMatrixCandidateCount: number;
  recommendedExtractionCount: number;
  zeroAssertionCount: number;
}

function strengthenAssertionsRecommendation(zeroAssertionCount: number): ScrapRecommendation[] {
  if (zeroAssertionCount === 0) {
    return [];
  }

  return [{
    confidence: 'HIGH',
    kind: 'STRENGTHEN_ASSERTIONS',
    message: `${zeroAssertionCount} example(s) have no assertions and should be tightened before structural cleanup.`
  }];
}

function tableDriveRecommendation(
  examples: ScrapExampleMetric[],
  coverageMatrixCandidateCount: number
): ScrapRecommendation[] {
  if (coverageMatrixCandidateCount === 0) {
    return [];
  }

  return [{
    confidence: 'HIGH',
    kind: 'TABLE_DRIVE',
    message: `${coverageMatrixCandidateCount} example(s) look like a coverage matrix that should be table-driven.${summarizeBlockPaths(coverageRelevantExamples(examples))}`
  }];
}

function extractSetupRecommendation(examples: ScrapExampleMetric[], repeatedSetupCount: number): ScrapRecommendation[] {
  if (repeatedSetupCount === 0) {
    return [];
  }

  const strongestCluster = strongestSetupCluster(examples);

  return [{
    confidence: 'MEDIUM',
    kind: 'EXTRACT_SETUP',
    message: `${repeatedSetupCount} repeated setup cluster(s) look worth extracting into shared helpers or fixtures.${summarizeBlockPaths(strongestCluster)}${summarizeHelperGroups(strongestCluster)}`
  }];
}

export function duplicationRecommendations(
  examples: ScrapExampleMetric[],
  counts: DuplicationRecommendationCounts
): ScrapRecommendation[] {
  return [
    ...strengthenAssertionsRecommendation(counts.zeroAssertionCount),
    ...tableDriveRecommendation(examples, counts.coverageMatrixCandidateCount),
    ...extractSetupRecommendation(examples, counts.recommendedExtractionCount)
  ];
}
