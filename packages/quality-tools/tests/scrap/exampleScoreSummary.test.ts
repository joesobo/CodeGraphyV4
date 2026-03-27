import { describe, expect, it } from 'vitest';
import { averageScore, hotExampleCount, maxScore, roundScore, worstExamples } from '../../src/scrap/exampleScoreSummary';
import type { ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function example(name: string, score: number): ScrapExampleMetric {
  return {
    assertionCount: 2,
    blockPath: ['suite'],
    branchCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 0,
    endLine: score + 1,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name,
    score,
    setupLineCount: 0,
    startLine: 1
  };
}

describe('exampleScoreSummary', () => {
  it('computes score summaries and keeps only the worst five examples', () => {
    const examples = [
      example('a', 1),
      example('b', 9),
      example('c', 6),
      example('d', 8),
      example('e', 4),
      example('f', 7)
    ];

    expect(averageScore(examples)).toBe((1 + 9 + 6 + 8 + 4 + 7) / 6);
    expect(maxScore(examples)).toBe(9);
    expect(hotExampleCount(examples)).toBe(2);
    expect(worstExamples(examples).map((metric) => metric.name)).toEqual(['b', 'd', 'f', 'c', 'e']);
  });

  it('returns zero averages for empty input and rounds scores to two decimals', () => {
    expect(averageScore([])).toBe(0);
    expect(maxScore([])).toBe(0);
    expect(hotExampleCount([])).toBe(0);
    expect(worstExamples([])).toEqual([]);
    expect(roundScore(1.234)).toBe(1.23);
    expect(roundScore(1.235)).toBe(1.24);
  });
});
