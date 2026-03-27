import { describe, expect, it } from 'vitest';
import { cohesionRecommendations } from '../../src/scrap/cohesionRecommendations';
import type { ScrapCohesionMetrics } from '../../src/scrap/cohesionMetrics';

function cohesion(overrides: Partial<ScrapCohesionMetrics> = {}): ScrapCohesionMetrics {
  return {
    assertionShapeDiversity: 1,
    averageAssertionSimilarity: 1,
    averageExampleSimilarity: 1,
    averageFixtureSimilarity: 1,
    averageSetupSimilarity: 1,
    averageSubjectOverlap: 1,
    distinctSubjectCount: 1,
    exampleShapeDiversity: 1,
    fixtureShapeDiversity: 1,
    setupShapeDiversity: 1,
    subjectRepetitionScore: 1,
    ...overrides
  };
}

describe('cohesionRecommendations', () => {
  it('recommends structure review for broad subject spread', () => {
    expect(cohesionRecommendations(cohesion({
      averageSubjectOverlap: 0.1,
      distinctSubjectCount: 4
    }), 4)).toEqual([{
      confidence: 'LOW',
      kind: 'REVIEW_STRUCTURE',
      message: 'Examples touch 4 distinct subjects with little overlap. Review whether this file mixes responsibilities.'
    }]);
  });

  it('recommends structure review for structurally divergent examples with weak cohesion', () => {
    expect(cohesionRecommendations(cohesion({
      averageExampleSimilarity: 0.2,
      exampleShapeDiversity: 3,
      subjectRepetitionScore: 1
    }), 4)).toEqual([{
      confidence: 'LOW',
      kind: 'REVIEW_STRUCTURE',
      message: 'Examples vary structurally (diversity 3) with low similarity (0.2). Review whether this file mixes responsibilities.'
    }]);
  });

  it('returns no recommendations for cohesive files', () => {
    expect(cohesionRecommendations(cohesion(), 3)).toEqual([]);
  });

  it('does not recommend broad subject spread when the file is too small or overlap is too high', () => {
    expect(cohesionRecommendations(cohesion({
      averageSubjectOverlap: 0.11,
      distinctSubjectCount: 4
    }), 4)).toEqual([]);

    expect(cohesionRecommendations(cohesion({
      averageSubjectOverlap: 0,
      distinctSubjectCount: 4
    }), 3)).toEqual([]);

    expect(cohesionRecommendations(cohesion({
      averageSubjectOverlap: 0,
      distinctSubjectCount: 3
    }), 4)).toEqual([]);
  });

  it('does not recommend shape drift when similarity, diversity, repetition, or file size miss the threshold', () => {
    expect(cohesionRecommendations(cohesion({
      averageExampleSimilarity: 0.21,
      exampleShapeDiversity: 3,
      subjectRepetitionScore: 1
    }), 4)).toEqual([]);

    expect(cohesionRecommendations(cohesion({
      averageExampleSimilarity: 0.2,
      exampleShapeDiversity: 2,
      subjectRepetitionScore: 1
    }), 4)).toEqual([]);

    expect(cohesionRecommendations(cohesion({
      averageExampleSimilarity: 0.2,
      exampleShapeDiversity: 3,
      subjectRepetitionScore: 2
    }), 4)).toEqual([]);

    expect(cohesionRecommendations(cohesion({
      averageExampleSimilarity: 0.2,
      exampleShapeDiversity: 3,
      subjectRepetitionScore: 1
    }), 3)).toEqual([]);
  });
});
