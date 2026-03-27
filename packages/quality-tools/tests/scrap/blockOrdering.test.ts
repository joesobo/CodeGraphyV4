import { describe, expect, it } from 'vitest';
import { compareBlockSummaries } from '../../src/scrap/blockOrdering';
import { type ScrapBlockSummary } from '../../src/scrap/scrapTypes';

function summary(overrides: Partial<ScrapBlockSummary>): ScrapBlockSummary {
  return {
    averageScore: 5,
    branchingExampleCount: 0,
    duplicateSetupExampleCount: 0,
    exampleCount: 1,
    helperHiddenExampleCount: 0,
    hotExampleCount: 0,
    lowAssertionExampleCount: 0,
    maxScore: 5,
    name: 'suite',
    path: ['suite'],
    remediationMode: 'STABLE',
    zeroAssertionExampleCount: 0,
    ...overrides
  };
}

describe('compareBlockSummaries', () => {
  it('orders by max score, average score, example count, and then path', () => {
    const higherMax = summary({ averageScore: 9, maxScore: 10, name: 'high', path: ['high'] });
    const moreExamples = summary({ averageScore: 8, exampleCount: 3, maxScore: 9, name: 'more', path: ['b'] });
    const fewerExamples = summary({ averageScore: 8, exampleCount: 2, maxScore: 9, name: 'less', path: ['a'] });
    const longerPath = summary({ averageScore: 8, exampleCount: 2, maxScore: 9, name: 'longer', path: ['a', 'b'] });
    const flatPath = summary({ averageScore: 8, exampleCount: 2, maxScore: 9, name: 'flat', path: ['ab'] });

    expect(compareBlockSummaries(higherMax, moreExamples)).toBeLessThan(0);
    expect(compareBlockSummaries(moreExamples, fewerExamples)).toBeLessThan(0);
    expect(compareBlockSummaries(fewerExamples, moreExamples)).toBeGreaterThan(0);
    expect(compareBlockSummaries(longerPath, flatPath)).toBeLessThan(0);
  });
});
