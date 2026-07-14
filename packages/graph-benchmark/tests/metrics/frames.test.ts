import { describe, expect, it } from 'vitest';

import { estimateRefreshRate, summarizeRenderedFrames } from '../../src/metrics/frames';

describe('summarizeRenderedFrames', () => {
  it('estimates the compositor refresh ceiling from RAF intervals', () => {
    expect(estimateRefreshRate([7.1, 6.9, 7, 8])).toBeCloseTo(142.857, 3);
  });

  it('caps refresh utilization at the measured presentation ceiling', () => {
    expect(summarizeRenderedFrames([10, 10], 20, 60).refreshUtilization).toBe(1);
  });

  it('reports FPS, percentiles, and missed frame budgets', () => {
    const summary = summarizeRenderedFrames([10, 16, 20, 40], 86, 60);

    expect(summary.fps).toBeCloseTo(46.5116, 4);
    expect(summary.refreshRateHz).toBe(60);
    expect(summary.refreshUtilization).toBeCloseTo(0.7752, 4);
    expect(summary.frameTimeMs).toEqual({
      mean: 21.5,
      p50: 16,
      p95: 40,
      p99: 40,
      max: 40,
      sampleCount: 4,
      over16ms: 2,
      over33ms: 1,
    });
  });
});
