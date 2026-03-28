import { describe, expect, it } from 'vitest';
import { verdictFromDeltas } from '../../src/organize/verdict';

describe('verdictFromDeltas', () => {
  it('returns unchanged when all deltas are zero', () => {
    expect(verdictFromDeltas(0, 0, 0, 0, 0)).toBe('unchanged');
  });

  it('returns improved when all deltas are negative or zero with at least one negative', () => {
    expect(verdictFromDeltas(-1, 0, -1, 0, 0)).toBe('improved');
    expect(verdictFromDeltas(-1, -1, -1, -1, -1)).toBe('improved');
  });

  it('returns worse when all deltas are positive or zero with at least one positive', () => {
    expect(verdictFromDeltas(1, 0, 1, 0, 0)).toBe('worse');
    expect(verdictFromDeltas(1, 1, 1, 1, 1)).toBe('worse');
  });

  it('returns mixed when deltas have both positive and negative', () => {
    expect(verdictFromDeltas(-1, 1, 0, 0, 0)).toBe('mixed');
    expect(verdictFromDeltas(1, -1, 1, -1, 0)).toBe('mixed');
  });

  it('distinguishes between zero and negative at boundary', () => {
    // All zero should be unchanged, not improved
    expect(verdictFromDeltas(0, 0, 0, 0, 0)).toBe('unchanged');
    // One negative should be improved
    expect(verdictFromDeltas(-1, 0, 0, 0, 0)).toBe('improved');
  });

  it('distinguishes between zero and positive at boundary', () => {
    // All zero should be unchanged, not worse
    expect(verdictFromDeltas(0, 0, 0, 0, 0)).toBe('unchanged');
    // One positive should be worse
    expect(verdictFromDeltas(1, 0, 0, 0, 0)).toBe('worse');
  });

  it('handles all five delta parameters in correct order', () => {
    // fileFanOutDelta, folderFanOutDelta, clusterCountDelta, issueCountDelta, redundancyDelta
    expect(verdictFromDeltas(-5, -2, -1, -1, -0.1)).toBe('improved');
    expect(verdictFromDeltas(2, 1, 0, 0, 0.1)).toBe('worse');
  });
});
