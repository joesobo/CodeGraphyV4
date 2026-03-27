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
  fixtureDuplicationScore: number;
  literalDuplicationScore: number;
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

function setupGroupSizes(examples: ScrapExampleMetric[]): number[] {
  const fuzzySetupGroups = fuzzyGroups(examples, (example) => example.setupFeatures);
  return examples.map((example, index) =>
    Math.max(fuzzySetupGroups[index] ?? 0, example.duplicateSetupGroupSize)
  );
}

export function analyzeDuplicationInsights(examples: ScrapExampleMetric[]): DuplicationInsights {
  const resolvedSetupGroupSizes = setupGroupSizes(examples);
  const assertionGroupSizes = resolvedGroups(
    examples,
    fuzzyGroups(examples, (example) => example.assertionFeatures),
    (example) => example.assertionFingerprint
  );
  const fixtureGroupSizes = resolvedGroups(
    examples,
    fuzzyGroups(examples, (example) => example.fixtureFeatures),
    (example) => example.fixtureFingerprint
  );
  const literalShapeGroupSizes = countedFingerprintGroups(
    examples,
    (example) => example.literalShapeFingerprint
  );
  const exampleGroupSizes = resolvedGroups(
    examples,
    fuzzyGroups(examples, (example) => example.exampleFeatures),
    (example) => example.exampleFingerprint
  );
  const zeroAssertionCount = examples.filter((example) => example.assertionCount === 0).length;
  const setupDuplicationScore = duplicateGroupCount(resolvedSetupGroupSizes);
  const assertionDuplicationScore = duplicateGroupCount(assertionGroupSizes);
  const fixtureDuplicationScore = duplicateGroupCount(fixtureGroupSizes);
  const literalDuplicationScore = duplicateGroupCount(literalShapeGroupSizes);
  const coverageMatrixCandidates = coverageMatrixCandidateCount(examples, {
    exampleGroupSizes,
    fixtureGroupSizes,
    literalShapeGroupSizes
  });
  const harmfulDuplicationScore = setupDuplicationScore + assertionDuplicationScore + fixtureDuplicationScore;
  const effectiveDuplicationScore = Math.max(0, harmfulDuplicationScore - coverageMatrixCandidates);
  const extractionPressureScore = Math.max(
    0,
    setupDuplicationScore + fixtureDuplicationScore - coverageMatrixCandidates
  );
  const repeatedSetupCount = recommendedExtractionCount(examples);
  const recommendations: ScrapRecommendation[] = duplicationRecommendations(examples, {
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
    fixtureDuplicationScore,
    literalDuplicationScore,
    recommendations,
    recommendedExtractionCount: repeatedSetupCount,
    setupDuplicationScore
  };
}
