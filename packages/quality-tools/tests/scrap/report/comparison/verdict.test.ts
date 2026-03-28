import { describe, expect, it } from 'vitest';
import { verdictFromDeltas } from '../../../../src/scrap/report/verdict';

describe('verdictFromDeltas', () => {
  it('returns mixed when improvements and regressions are both present', () => {
    expect(verdictFromDeltas({
      averageScoreDelta: -1,
      coverageMatrixDelta: 1,
      extractionPressureDelta: 0,
      harmfulDuplicationDelta: 0,
      helperHiddenDelta: 0,
      maxScoreDelta: 0
    })).toBe('mixed');
  });

  it('returns worse when only regressions are present', () => {
    expect(verdictFromDeltas({
      averageScoreDelta: 1,
      coverageMatrixDelta: 0,
      extractionPressureDelta: 0,
      harmfulDuplicationDelta: 0,
      helperHiddenDelta: 0,
      maxScoreDelta: 0
    })).toBe('worse');
  });

  it('returns improved when only improvements are present', () => {
    expect(verdictFromDeltas({
      averageScoreDelta: -1,
      coverageMatrixDelta: 0,
      extractionPressureDelta: 0,
      harmfulDuplicationDelta: 0,
      helperHiddenDelta: 0,
      maxScoreDelta: 0
    })).toBe('improved');
  });

  it('returns unchanged when all deltas are zero', () => {
    expect(verdictFromDeltas({
      averageScoreDelta: 0,
      coverageMatrixDelta: 0,
      extractionPressureDelta: 0,
      harmfulDuplicationDelta: 0,
      helperHiddenDelta: 0,
      maxScoreDelta: 0
    })).toBe('unchanged');
  });
});
