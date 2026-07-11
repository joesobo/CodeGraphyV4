import { describe, expect, it } from 'vitest';

import { summarizeRenderedFrames } from '../../src/metrics/frames';

describe('summarizeRenderedFrames', () => {
  it('reports FPS, percentiles, and missed frame budgets', () => {
    const summary = summarizeRenderedFrames([10, 16, 20, 40], 86);

    expect(summary.fps).toBeCloseTo(46.5116, 4);
    expect(summary.frameTimeMs).toEqual({
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
