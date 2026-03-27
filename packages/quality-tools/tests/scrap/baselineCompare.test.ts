import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { applyBaselineComparison } from '../../src/scrap/baselineCompare';
import type { ScrapFileMetric } from '../../src/scrap/scrapTypes';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    averageScore: 4,
    blockSummaries: [],
    branchingExampleCount: 0,
    coverageMatrixCandidateCount: 1,
    duplicateSetupExampleCount: 0,
    exampleCount: 1,
    extractionPressureScore: 2,
    filePath: '/repo/file.test.ts',
    harmfulDuplicationScore: 2,
    helperHiddenExampleCount: 1,
    lowAssertionExampleCount: 0,
    maxScore: 6,
    remediationMode: 'LOCAL',
    worstExamples: [],
    zeroAssertionExampleCount: 0,
    ...overrides
  };
}

describe('applyBaselineComparison', () => {
  it('adds comparison deltas and verdicts from a saved baseline', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-scrap-baseline-')), 'baseline.json');
    writeFileSync(baselinePath, JSON.stringify([
      {
        averageScore: 5,
        coverageMatrixCandidateCount: 0,
        extractionPressureScore: 3,
        filePath: '/repo/file.test.ts',
        harmfulDuplicationScore: 4,
        helperHiddenExampleCount: 2,
        maxScore: 7
      }
    ]));

    const [result] = applyBaselineComparison([metric()], baselinePath);

    expect(result?.comparison).toEqual({
      averageScoreDelta: -1,
      coverageMatrixDelta: 1,
      extractionPressureDelta: -1,
      harmfulDuplicationDelta: -2,
      helperHiddenDelta: -1,
      maxScoreDelta: -1,
      verdict: 'mixed'
    });
  });
});
