import { type ScrapExampleMetric } from './scrapTypes';
import { isSimpleCoverageMatrixShape } from './coverageMatrixShape';
import { hasStructuredVariation } from './coverageMatrixVariation';

export interface CoverageMatrixGroupSizes {
  exampleGroupSizes: number[];
  fixtureGroupSizes: number[];
  literalShapeGroupSizes: number[];
}

export function isCoverageMatrixCandidate(
  example: ScrapExampleMetric,
  duplicateSize: number,
  literalShapeGroupSize = 0,
  fixtureGroupSize = 0
): boolean {
  if (duplicateSize <= 1) {
    return false;
  }

  if (example.tableDriven === true) {
    return true;
  }

  const structuredVariation = hasStructuredVariation(
    example,
    literalShapeGroupSize,
    fixtureGroupSize
  );

  return structuredVariation && isSimpleCoverageMatrixShape(example);
}

export function coverageMatrixCandidateCount(
  examples: ScrapExampleMetric[],
  groupSizes: CoverageMatrixGroupSizes
): number {
  return examples.filter((example, index) => (
    isCoverageMatrixCandidate(
      example,
      groupSizes.exampleGroupSizes[index] ?? 0,
      groupSizes.literalShapeGroupSizes[index] ?? 0,
      groupSizes.fixtureGroupSizes[index] ?? 0
    )
  )).length;
}
