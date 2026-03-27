import { averagePairwiseSimilarity, shapeDiversity } from './similarityGroups';
import { type ScrapExampleMetric } from './scrapTypes';

export interface ScrapCohesionMetrics {
  assertionShapeDiversity: number;
  averageAssertionSimilarity: number;
  averageExampleSimilarity: number;
  averageSetupSimilarity: number;
  averageSubjectOverlap: number;
  distinctSubjectCount: number;
  exampleShapeDiversity: number;
  setupShapeDiversity: number;
  subjectRepetitionScore: number;
}

function distinctSubjectCount(examples: ScrapExampleMetric[]): number {
  const subjects = new Set(examples.flatMap((example) => example.subjectNames ?? []));
  return subjects.size;
}

function subjectRepetitionScore(examples: ScrapExampleMetric[]): number {
  const counts = new Map<string, number>();
  examples.flatMap((example) => example.subjectNames ?? []).forEach((subject) => {
    counts.set(subject, (counts.get(subject) ?? 0) + 1);
  });
  return [...counts.values()].filter((count) => count > 1).length;
}

export function analyzeCohesionMetrics(examples: ScrapExampleMetric[]): ScrapCohesionMetrics {
  const assertionFeatures = examples.map((example) => example.assertionFeatures);
  const exampleFeatures = examples.map((example) => example.exampleFeatures);
  const setupFeatures = examples.map((example) => example.setupFeatures);
  const subjectSets = examples.map((example) => example.subjectNames);

  return {
    assertionShapeDiversity: shapeDiversity(assertionFeatures),
    averageAssertionSimilarity: averagePairwiseSimilarity(assertionFeatures),
    averageExampleSimilarity: averagePairwiseSimilarity(exampleFeatures),
    averageSetupSimilarity: averagePairwiseSimilarity(setupFeatures),
    averageSubjectOverlap: averagePairwiseSimilarity(subjectSets),
    distinctSubjectCount: distinctSubjectCount(examples),
    exampleShapeDiversity: shapeDiversity(exampleFeatures),
    setupShapeDiversity: shapeDiversity(setupFeatures),
    subjectRepetitionScore: subjectRepetitionScore(examples)
  };
}
