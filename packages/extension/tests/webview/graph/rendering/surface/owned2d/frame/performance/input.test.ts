import { describe, expect, it } from 'vitest';
import { validFramePerformanceInput } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/performance/input';

const valid = {
  presentationTimestampMs: 0,
  renderMs: 0,
  simulationMs: 0,
};

describe('owned graph performance input', () => {
  it.each([undefined, 0, 0.5])('accepts an optional finite nonnegative secondary cost', secondaryRefreshMs => {
    expect(validFramePerformanceInput({ ...valid, secondaryRefreshMs })).toBe(true);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid secondary cost',
    secondaryRefreshMs => {
      expect(validFramePerformanceInput({ ...valid, secondaryRefreshMs })).toBe(false);
    },
  );
});
