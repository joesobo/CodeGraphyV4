import { describe, expect, it } from 'vitest';
import { hasBroadSubjectSpread, hasShapeDrift } from '../../../src/scrap/metrics/cohesionPredicates';
import type { ScrapCohesionMetrics } from '../../../src/scrap/metrics/compute';

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

describe('cohesionPredicates', () => {
  describe('hasBroadSubjectSpread', () => {
    it('returns true when all conditions are met', () => {
      expect(hasBroadSubjectSpread(cohesion({
        averageSubjectOverlap: 0.1,
        distinctSubjectCount: 4
      }), 4)).toBe(true);
    });

    it('returns false when example count is less than 4', () => {
      expect(hasBroadSubjectSpread(cohesion({
        averageSubjectOverlap: 0.1,
        distinctSubjectCount: 4
      }), 3)).toBe(false);
    });

    it('returns false when distinct subject count is less than 4', () => {
      expect(hasBroadSubjectSpread(cohesion({
        averageSubjectOverlap: 0.1,
        distinctSubjectCount: 3
      }), 4)).toBe(false);
    });

    it('returns false when average subject overlap exceeds 0.1', () => {
      expect(hasBroadSubjectSpread(cohesion({
        averageSubjectOverlap: 0.11,
        distinctSubjectCount: 4
      }), 4)).toBe(false);
    });
  });

  describe('hasShapeDrift', () => {
    it('returns true when all conditions are met', () => {
      expect(hasShapeDrift(cohesion({
        averageExampleSimilarity: 0.2,
        exampleShapeDiversity: 3,
        subjectRepetitionScore: 1
      }), 4)).toBe(true);
    });

    it('returns false when example count is less than 4', () => {
      expect(hasShapeDrift(cohesion({
        averageExampleSimilarity: 0.2,
        exampleShapeDiversity: 3,
        subjectRepetitionScore: 1
      }), 3)).toBe(false);
    });

    it('returns false when shape diversity is less than 3', () => {
      expect(hasShapeDrift(cohesion({
        averageExampleSimilarity: 0.2,
        exampleShapeDiversity: 2,
        subjectRepetitionScore: 1
      }), 4)).toBe(false);
    });

    it('returns false when average example similarity exceeds 0.2', () => {
      expect(hasShapeDrift(cohesion({
        averageExampleSimilarity: 0.21,
        exampleShapeDiversity: 3,
        subjectRepetitionScore: 1
      }), 4)).toBe(false);
    });

    it('returns false when subject repetition score exceeds 1', () => {
      expect(hasShapeDrift(cohesion({
        averageExampleSimilarity: 0.2,
        exampleShapeDiversity: 3,
        subjectRepetitionScore: 2
      }), 4)).toBe(false);
    });
  });
});
