import { describe, expect, it } from 'vitest';
import { coverageMatrixCandidateCount, isCoverageMatrixCandidate } from '../../src/scrap/coverageMatrixCandidates';
import type { ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function example(overrides: Partial<ScrapExampleMetric> = {}): ScrapExampleMetric {
  return {
    assertionCount: 1,
    blockPath: ['suite'],
    branchCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 0,
    endLine: 5,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name: 'example',
    score: 2,
    setupLineCount: 0,
    startLine: 1,
    ...overrides
  };
}

describe('coverageMatrixCandidates', () => {
  it('treats repeated table-driven and repeated simple examples as coverage-matrix candidates', () => {
    expect(isCoverageMatrixCandidate(example({ tableDriven: true }), 2)).toBe(true);
    expect(isCoverageMatrixCandidate(example(), 2)).toBe(true);
    expect(isCoverageMatrixCandidate(example({ branchCount: 1, lineCount: 8 }), 2)).toBe(true);
    expect(isCoverageMatrixCandidate(example({
      assertionCount: 0,
      branchCount: 3,
      lineCount: 20,
      mockCount: 2,
      tableDriven: true
    }), 2)).toBe(true);
  });

  it('rejects examples that are unique or structurally noisy', () => {
    expect(isCoverageMatrixCandidate(example(), 1)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ assertionCount: 0 }), 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ branchCount: 2 }), 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ helperHiddenLineCount: 5 }), 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ lineCount: 9 }), 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ mockCount: 1 }), 2)).toBe(false);
  });

  it('counts only the repeated examples that match the candidate rules', () => {
    const examples = [
      example({ exampleFingerprint: 'a' }),
      example({ exampleFingerprint: 'a' }),
      example({ exampleFingerprint: 'b', tableDriven: true }),
      example({ exampleFingerprint: 'b', tableDriven: true }),
      example({ exampleFingerprint: 'c', branchCount: 2 }),
      example({ exampleFingerprint: 'c', branchCount: 2 })
    ];

    expect(coverageMatrixCandidateCount(examples, [2, 2, 2, 2, 2, 2])).toBe(4);
  });
});
