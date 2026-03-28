import { type ScrapCohesionMetrics } from './compute';
import { type ScrapRecommendation } from '../types';
import { hasBroadSubjectSpread, hasShapeDrift } from './cohesionPredicates';

function buildReasonMessage(
  cohesion: ScrapCohesionMetrics,
  isBroadSpread: boolean
): string {
  if (isBroadSpread) {
    return `Examples touch ${cohesion.distinctSubjectCount} distinct subjects with little overlap.`;
  }
  return `Examples vary structurally (diversity ${cohesion.exampleShapeDiversity}) with low similarity (${cohesion.averageExampleSimilarity}).`;
}

export function cohesionRecommendations(
  cohesion: ScrapCohesionMetrics,
  exampleCount: number
): ScrapRecommendation[] {
  const broadSubjectSpread = hasBroadSubjectSpread(cohesion, exampleCount);
  const shapeDrift = hasShapeDrift(cohesion, exampleCount);

  if (broadSubjectSpread || shapeDrift) {
    const reason = buildReasonMessage(cohesion, broadSubjectSpread);

    return [{
      confidence: 'LOW',
      kind: 'REVIEW_STRUCTURE',
      message: `${reason} Review whether this file mixes responsibilities.`
    }];
  }

  return [];
}
