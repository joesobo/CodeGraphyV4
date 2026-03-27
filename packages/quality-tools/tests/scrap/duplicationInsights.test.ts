import { describe, expect, it } from 'vitest';
import { analyzeDuplicationInsights } from '../../src/scrap/duplicationInsights';
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

describe('analyzeDuplicationInsights', () => {
  it('marks duplicate low-complexity examples as coverage-matrix candidates', () => {
    const result = analyzeDuplicationInsights([
      example({ exampleFingerprint: 'same', tableDriven: true }),
      example({ exampleFingerprint: 'same', tableDriven: true })
    ]);

    expect(result.coverageMatrixCandidateCount).toBe(2);
    expect(result.recommendations).toContainEqual({
      confidence: 'HIGH',
      kind: 'TABLE_DRIVE',
      message: '2 example(s) look like a coverage matrix that should be table-driven.'
    });
  });

  it('recommends extraction for repeated setup clusters', () => {
    const result = analyzeDuplicationInsights([
      example({
        duplicateSetupGroupSize: 2,
        setupFingerprint: 'setup-a',
        setupLineCount: 3
      }),
      example({
        duplicateSetupGroupSize: 2,
        setupFingerprint: 'setup-a',
        setupLineCount: 3
      })
    ]);

    expect(result.setupDuplicationScore).toBe(2);
    expect(result.recommendedExtractionCount).toBe(1);
    expect(result.recommendations).toContainEqual({
      confidence: 'MEDIUM',
      kind: 'EXTRACT_SETUP',
      message: '1 repeated setup cluster(s) look worth extracting into shared helpers or fixtures.'
    });
  });

  it('counts harmful duplication and zero-assertion pressure separately from effective duplication', () => {
    const result = analyzeDuplicationInsights([
      example({
        assertionCount: 1,
        assertionFingerprint: 'assert-a',
        duplicateSetupGroupSize: 2,
        exampleFingerprint: 'matrix-a',
        setupFingerprint: 'setup-a',
        setupLineCount: 3
      }),
      example({
        assertionCount: 1,
        assertionFingerprint: 'assert-a',
        duplicateSetupGroupSize: 2,
        exampleFingerprint: 'matrix-a',
        setupFingerprint: 'setup-a',
        setupLineCount: 3
      }),
      example({
        assertionCount: 0,
        assertionFingerprint: 'assert-b'
      })
    ]);

    expect(result.assertionDuplicationScore).toBe(2);
    expect(result.setupDuplicationScore).toBe(2);
    expect(result.harmfulDuplicationScore).toBe(4);
    expect(result.coverageMatrixCandidateCount).toBe(2);
    expect(result.effectiveDuplicationScore).toBe(2);
    expect(result.extractionPressureScore).toBe(2);
    expect(result.recommendations).toContainEqual({
      confidence: 'HIGH',
      kind: 'STRENGTHEN_ASSERTIONS',
      message: '1 example(s) have no assertions and should be tightened before structural cleanup.'
    });
  });

  it('treats near-match example shapes as one fuzzy duplicate cluster', () => {
    const result = analyzeDuplicationInsights([
      example({
        assertionFeatures: ['expect', 'call', 'toBe'],
        assertionFingerprint: 'assert-a',
        exampleFeatures: ['const', 'call', 'expect', 'toBe'],
        exampleFingerprint: 'example-a',
        setupFeatures: ['const', 'call', 'mock'],
        setupFingerprint: 'setup-a',
        setupLineCount: 2
      }),
      example({
        assertionFeatures: ['expect', 'call', 'toBe'],
        assertionFingerprint: 'assert-b',
        exampleFeatures: ['const', 'call', 'expect', 'toBeDefined'],
        exampleFingerprint: 'example-b',
        setupFeatures: ['const', 'call', 'mock', 'extra'],
        setupFingerprint: 'setup-b',
        setupLineCount: 3
      })
    ]);

    expect(result.setupDuplicationScore).toBe(2);
    expect(result.assertionDuplicationScore).toBe(2);
    expect(result.coverageMatrixCandidateCount).toBe(2);
  });
});
