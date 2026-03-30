import { type ScrapCohesionMetrics } from './compute';

export function hasBroadSubjectSpread(
  cohesion: ScrapCohesionMetrics,
  exampleCount: number
): boolean {
  return (
    exampleCount >= 4 &&
    cohesion.distinctSubjectCount >= 4 &&
    cohesion.averageSubjectOverlap <= 0.1
  );
}

export function hasShapeDrift(
  cohesion: ScrapCohesionMetrics,
  exampleCount: number
): boolean {
  return (
    exampleCount >= 4 &&
    cohesion.exampleShapeDiversity >= 3 &&
    cohesion.averageExampleSimilarity <= 0.2 &&
    cohesion.subjectRepetitionScore <= 1
  );
}
