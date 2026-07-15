import { describe, expect, it } from 'vitest';
import { summarizePerformanceDistribution } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/distribution';

describe('owned graph performance distribution', () => {
  it('reports arithmetic mean, maximum, and the slowest one percent', () => {
    const values = Array.from({ length: 200 }, (_, index) => index + 1);

    expect(summarizePerformanceDistribution(values)).toEqual({
      average: 100.5,
      maximum: 200,
      onePercentHigh: 199.5,
    });
  });

  it('uses the maximum sample when fewer than one hundred values exist', () => {
    expect(summarizePerformanceDistribution([2, 8, 4])).toEqual({
      average: 14 / 3,
      maximum: 8,
      onePercentHigh: 8,
    });
  });
});
