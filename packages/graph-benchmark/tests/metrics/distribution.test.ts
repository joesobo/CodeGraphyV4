import { describe, expect, it } from 'vitest';

import { summarizeDistribution } from '../../src/metrics/distribution';

describe('summarizeDistribution', () => {
  it('reports nearest-rank latency percentiles', () => {
    expect(summarizeDistribution([4, 1, 100, 3, 2])).toEqual({
      p50: 3,
      p95: 100,
      p99: 100,
      max: 100,
      sampleCount: 5,
    });
  });
});
