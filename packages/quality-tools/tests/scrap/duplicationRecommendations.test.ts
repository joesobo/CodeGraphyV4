import { describe, expect, it } from 'vitest';
import { duplicationRecommendations } from '../../src/scrap/duplicationRecommendations';
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

describe('duplicationRecommendations', () => {
  it('returns no recommendations when no duplication pressure exists', () => {
    expect(duplicationRecommendations([], {
      coverageMatrixCandidateCount: 0,
      recommendedExtractionCount: 0,
      zeroAssertionCount: 0
    })).toEqual([]);
  });

  it('returns assertion, table-drive, and setup extraction recommendations when needed', () => {
    expect(duplicationRecommendations([
      example({ blockPath: ['suite', 'resolveTestScopes'], duplicateSetupGroupSize: 2, setupFingerprint: 'shared-a', setupLineCount: 3, setupSubjectNames: ['createRepo'] }),
      example({ blockPath: ['suite', 'resolveTestScopes'], duplicateSetupGroupSize: 2, setupFingerprint: 'shared-a', setupLineCount: 3, setupSubjectNames: ['createRepo'] })
    ], {
      coverageMatrixCandidateCount: 3,
      recommendedExtractionCount: 2,
      zeroAssertionCount: 1
    })).toEqual([
      {
        confidence: 'HIGH',
        kind: 'STRENGTHEN_ASSERTIONS',
        message: '1 example(s) have no assertions and should be tightened before structural cleanup.'
      },
      {
        confidence: 'HIGH',
        kind: 'TABLE_DRIVE',
        message: '3 example(s) look like a coverage matrix that should be table-driven.'
      },
      {
        confidence: 'MEDIUM',
        kind: 'EXTRACT_SETUP',
        message: '2 repeated setup cluster(s) look worth extracting into shared helpers or fixtures. Affected blocks: suite > resolveTestScopes. Helper groups: createRepo.'
      }
    ]);
  });
});
