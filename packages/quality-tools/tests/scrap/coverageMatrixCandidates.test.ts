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
    expect(isCoverageMatrixCandidate(example({ branchCount: 1, lineCount: 8 }), 2, 2)).toBe(true);
    expect(isCoverageMatrixCandidate(example({
      assertionCount: 0,
      branchCount: 3,
      lineCount: 20,
      mockCount: 2,
      tableDriven: true
    }), 2)).toBe(true);
  });

  it('requires repeated literal or fixture variation for non-table-driven examples', () => {
    expect(isCoverageMatrixCandidate(example(), 2, 1, 0)).toBe(false);
    expect(isCoverageMatrixCandidate(example(), 2, 0, 1)).toBe(false);
    expect(isCoverageMatrixCandidate(example(), 2, 2, 0)).toBe(true);
    expect(isCoverageMatrixCandidate(example(), 2, 0, 2)).toBe(true);
  });

  it('rejects examples that are unique or structurally noisy', () => {
    expect(isCoverageMatrixCandidate(example(), 1, 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example(), 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ assertionCount: 0 }), 2, 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ branchCount: 2 }), 2, 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ helperHiddenLineCount: 5 }), 2, 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ lineCount: 13 }), 2, 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ mockCount: 1 }), 2, 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ setupLineCount: 4 }), 2, 2)).toBe(false);
    expect(isCoverageMatrixCandidate(example({ tempResourceCount: 2 }), 2, 2)).toBe(false);
  });

  it('treats repeated scalar variations in compact examples as coverage-matrix candidates', () => {
    expect(isCoverageMatrixCandidate(example({
      lineCount: 11,
      setupLineCount: 3,
      tempResourceCount: 1
    }), 2, 2, 0)).toBe(true);
    expect(isCoverageMatrixCandidate(example({
      lineCount: 12,
      setupLineCount: 3,
      tempResourceCount: 1
    }), 2, 2, 0)).toBe(true);
    expect(isCoverageMatrixCandidate(example({
      lineCount: 11,
      setupLineCount: 2,
      tempResourceCount: 1
    }), 2, 0, 2)).toBe(true);
  });

  it('counts only the repeated examples that match the candidate rules', () => {
    const examples = [
      example({ exampleFingerprint: 'a', literalShapeFingerprint: 'literal-a' }),
      example({ exampleFingerprint: 'a', literalShapeFingerprint: 'literal-a' }),
      example({ exampleFingerprint: 'b', tableDriven: true }),
      example({ exampleFingerprint: 'b', tableDriven: true }),
      example({ exampleFingerprint: 'd', fixtureFingerprint: 'fixture-a' }),
      example({ exampleFingerprint: 'd', fixtureFingerprint: 'fixture-a' }),
      example({ exampleFingerprint: 'c', branchCount: 2 }),
      example({ exampleFingerprint: 'c', branchCount: 2 })
    ];

    expect(coverageMatrixCandidateCount(examples, {
      exampleGroupSizes: [2, 2, 2, 2, 2, 2, 2, 2],
      fixtureGroupSizes: [0, 0, 0, 0, 2, 2, 0, 0],
      literalShapeGroupSizes: [2, 2, 0, 0, 0, 0, 0, 0]
    })).toBe(6);
  });
});
