import { type ScrapCohesionMetrics } from './cohesionMetrics';
import { type ScrapRecommendation } from './scrapTypes';

export function cohesionRecommendations(
  cohesion: ScrapCohesionMetrics,
  exampleCount: number
): ScrapRecommendation[] {
  if (
    exampleCount >= 4 &&
    cohesion.distinctSubjectCount >= 4 &&
    cohesion.averageSubjectOverlap <= 0.1
  ) {
    return [{
      confidence: 'LOW',
      kind: 'REVIEW_STRUCTURE',
      message: `Examples touch ${cohesion.distinctSubjectCount} distinct subjects with little overlap. Review whether this file mixes responsibilities.`
    }];
  }

  return [];
}
