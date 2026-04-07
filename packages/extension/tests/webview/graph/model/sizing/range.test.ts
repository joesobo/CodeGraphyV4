import { describe, expect, it } from 'vitest';
import { getMetricRange, scaleMetricValue } from '../../../../../src/webview/components/graph/model/sizing/range';

describe('graph/model/sizing/range', () => {
  it('returns fallback-aware min max and non-zero range', () => {
    expect(getMetricRange([5, 10], 0, 1)).toEqual({
      min: 0,
      max: 10,
      range: 10,
    });
    expect(getMetricRange([], 0, 1)).toEqual({
      min: 0,
      max: 1,
      range: 1,
    });
  });

  it('scales a metric value into the requested output range', () => {
    expect(scaleMetricValue(5, 0, 10, 8, 32)).toBe(20);
  });
});
