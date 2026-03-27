import { describe, expect, it } from 'vitest';
import { analyzeCohesionMetrics } from '../../src/scrap/cohesionMetrics';
import type { ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function example(overrides: Partial<ScrapExampleMetric> = {}): ScrapExampleMetric {
  return {
    assertionCount: 1,
    assertionFeatures: [],
    blockPath: ['suite'],
    branchCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 0,
    endLine: 5,
    exampleFeatures: [],
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name: 'example',
    score: 2,
    setupFeatures: [],
    setupLineCount: 0,
    startLine: 1,
    subjectNames: [],
    ...overrides
  };
}

describe('analyzeCohesionMetrics', () => {
  it('tracks subject breadth, repeated subjects, and shape diversity', () => {
    const result = analyzeCohesionMetrics([
      example({
        assertionFeatures: ['assert-a'],
        exampleFeatures: ['example-a'],
        setupFeatures: ['setup-a'],
        subjectNames: ['parseNode', 'renderGraph']
      }),
      example({
        assertionFeatures: ['assert-a'],
        exampleFeatures: ['example-b'],
        setupFeatures: ['setup-a'],
        subjectNames: ['parseNode']
      }),
      example({
        assertionFeatures: ['assert-b'],
        exampleFeatures: ['example-c'],
        setupFeatures: ['setup-b'],
        subjectNames: ['buildTree']
      })
    ]);

    expect(result.distinctSubjectCount).toBe(3);
    expect(result.subjectRepetitionScore).toBe(1);
    expect(result.averageSubjectOverlap).toBeCloseTo((0.5 + 0 + 0) / 3, 5);
    expect(result.setupShapeDiversity).toBe(2);
    expect(result.assertionShapeDiversity).toBe(2);
    expect(result.exampleShapeDiversity).toBe(3);
  });

  it('returns zeroed cohesion metrics when examples have no tracked subjects', () => {
    expect(analyzeCohesionMetrics([
      example(),
      example()
    ])).toEqual({
      averageAssertionSimilarity: 0,
      averageExampleSimilarity: 0,
      averageSetupSimilarity: 0,
      averageSubjectOverlap: 0,
      assertionShapeDiversity: 0,
      distinctSubjectCount: 0,
      exampleShapeDiversity: 0,
      setupShapeDiversity: 0,
      subjectRepetitionScore: 0
    });
  });
});
