import { coverageMatrixCandidateCount } from './coverageMatrixCandidates';
import { duplicateGroupCount, countedFingerprintGroups } from './duplicationGroupSizes';
import { duplicationRecommendations } from './duplicationRecommendations';
import { recommendedExtractionCount } from './recommendedExtractionCount';
import { featureGroupSizes } from './similarityGroups';
import { type ScrapExampleMetric, type ScrapRecommendation } from './scrapTypes';

export interface DuplicationInsights {
  assertionDuplicationScore: number;
  coverageMatrixCandidateCount: number;
  effectiveDuplicationScore: number;
  extractionPressureScore: number;
  harmfulDuplicationScore: number;
  recommendations: ScrapRecommendation[];
  recommendedExtractionCount: number;
  setupDuplicationScore: number;
}

function fuzzyGroups(
  examples: ScrapExampleMetric[],
  selector: (example: ScrapExampleMetric) => string[] | undefined
): number[] {
  return featureGroupSizes(examples.map(selector));
}

function resolvedGroups(
  examples: ScrapExampleMetric[],
  fuzzyGroupSizes: number[],
  selector: (example: ScrapExampleMetric) => string | undefined
): number[] {
  return fuzzyGroupSizes.some((groupSize) => groupSize > 0)
    ? fuzzyGroupSizes
    : countedFingerprintGroups(examples, selector);
}

export function analyzeDuplicationInsights(examples: ScrapExampleMetric[]): DuplicationInsights {
  const setupGroupSizes = resolvedGroups(
    examples,
    fuzzyGroups(examples, (example) => example.setupFeatures),
    (example) => example.setupFingerprint
  ).map((groupSize, index) => Math.max(groupSize, examples[index]?.duplicateSetupGroupSize ?? 0));
  const assertionGroupSizes = resolvedGroups(
    examples,
    fuzzyGroups(examples, (example) => example.assertionFeatures),
    (example) => example.assertionFingerprint
  );
  const exampleGroupSizes = resolvedGroups(
    examples,
    fuzzyGroups(examples, (example) => example.exampleFeatures),
    (example) => example.exampleFingerprint
  );
  const zeroAssertionCount = examples.filter((example) => example.assertionCount === 0).length;
  const setupDuplicationScore = duplicateGroupCount(setupGroupSizes);
  const assertionDuplicationScore = duplicateGroupCount(assertionGroupSizes);
  const coverageMatrixCandidates = coverageMatrixCandidateCount(examples, exampleGroupSizes);
  const harmfulDuplicationScore = setupDuplicationScore + assertionDuplicationScore;
  const effectiveDuplicationScore = Math.max(0, harmfulDuplicationScore - coverageMatrixCandidates);
  const extractionPressureScore = Math.max(0, harmfulDuplicationScore - coverageMatrixCandidates);
  const repeatedSetupCount = recommendedExtractionCount(examples);
  const recommendations: ScrapRecommendation[] = duplicationRecommendations({
    coverageMatrixCandidateCount: coverageMatrixCandidates,
    recommendedExtractionCount: repeatedSetupCount,
    zeroAssertionCount
  });

  return {
    assertionDuplicationScore,
    coverageMatrixCandidateCount: coverageMatrixCandidates,
    effectiveDuplicationScore,
    extractionPressureScore,
    harmfulDuplicationScore,
    recommendations,
    recommendedExtractionCount: repeatedSetupCount,
    setupDuplicationScore
  };
}
