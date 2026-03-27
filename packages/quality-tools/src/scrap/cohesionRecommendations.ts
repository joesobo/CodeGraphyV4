import { type ScrapCohesionMetrics } from './cohesionMetrics';
import { type ScrapRecommendation } from './scrapTypes';

export function cohesionRecommendations(
  cohesion: ScrapCohesionMetrics,
  exampleCount: number
): ScrapRecommendation[] {
  const broadSubjectSpread = exampleCount >= 4 &&
    cohesion.distinctSubjectCount >= 4 &&
    cohesion.averageSubjectOverlap <= 0.1;
  const shapeDrift = exampleCount >= 4 &&
    cohesion.exampleShapeDiversity >= 3 &&
    cohesion.averageExampleSimilarity <= 0.2 &&
    cohesion.subjectRepetitionScore <= 1;

  if (
    broadSubjectSpread ||
    shapeDrift
  ) {
    const reason = broadSubjectSpread
      ? `Examples touch ${cohesion.distinctSubjectCount} distinct subjects with little overlap.`
      : `Examples vary structurally (diversity ${cohesion.exampleShapeDiversity}) with low similarity (${cohesion.averageExampleSimilarity}).`;

    return [{
      confidence: 'LOW',
      kind: 'REVIEW_STRUCTURE',
      message: `${reason} Review whether this file mixes responsibilities.`
    }];
  }

  return [];
}
