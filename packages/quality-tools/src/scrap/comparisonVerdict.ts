import { type ScrapComparison } from './scrapTypes';

function includesNegative(values: number[]): boolean {
  return values.some((value) => value < 0);
}

function includesPositive(values: number[]): boolean {
  return values.some((value) => value > 0);
}

export function verdictFromDeltas(
  comparison: Omit<ScrapComparison, 'verdict'>
): ScrapComparison['verdict'] {
  const deltas = [
    comparison.averageScoreDelta,
    comparison.maxScoreDelta,
    comparison.extractionPressureDelta,
    comparison.harmfulDuplicationDelta,
    comparison.coverageMatrixDelta,
    comparison.helperHiddenDelta
  ];

  const hasImprovement = includesNegative(deltas);
  const hasRegression = includesPositive(deltas);

  if (hasImprovement && hasRegression) {
    return 'mixed';
  }

  if (hasRegression) {
    return 'worse';
  }

  if (hasImprovement) {
    return 'improved';
  }

  return 'unchanged';
}
