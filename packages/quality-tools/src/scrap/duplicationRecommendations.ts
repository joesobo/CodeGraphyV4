import { type ScrapRecommendation } from './scrapTypes';

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

function tableDriveRecommendation(coverageMatrixCandidateCount: number): ScrapRecommendation[] {
  if (coverageMatrixCandidateCount === 0) {
    return [];
  }

  return [{
    confidence: 'HIGH',
    kind: 'TABLE_DRIVE',
    message: `${coverageMatrixCandidateCount} example(s) look like a coverage matrix that should be table-driven.`
  }];
}

function extractSetupRecommendation(repeatedSetupCount: number): ScrapRecommendation[] {
  if (repeatedSetupCount === 0) {
    return [];
  }

  return [{
    confidence: 'MEDIUM',
    kind: 'EXTRACT_SETUP',
    message: `${repeatedSetupCount} repeated setup cluster(s) look worth extracting into shared helpers or fixtures.`
  }];
}

export function duplicationRecommendations(
  counts: DuplicationRecommendationCounts
): ScrapRecommendation[] {
  return [
    ...strengthenAssertionsRecommendation(counts.zeroAssertionCount),
    ...tableDriveRecommendation(counts.coverageMatrixCandidateCount),
    ...extractSetupRecommendation(counts.recommendedExtractionCount)
  ];
}
