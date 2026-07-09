import { describe, expect, it } from 'vitest';

import {
  aggregatePerfReports,
  coefficientOfVariation,
  median,
} from './statistics';
import { createPerfReport } from './test/report';

describe('performance baseline statistics', () => {
  it('selects the middle value independently of sample order', () => {
    expect(median([9, 1, 5])).toBe(5);
  });

  it('averages the two middle values for an even sample', () => {
    expect(median([7, 1, 5, 3])).toBe(4);
  });

  it('rejects an empty sample', () => {
    expect(() => median([])).toThrow('at least one sample');
  });

  it('uses sample deviation for coefficient of variation', () => {
    expect(coefficientOfVariation([90, 100, 110])).toBeCloseTo(0.1, 10);
  });

  it('treats an all-zero sample as stable', () => {
    expect(coefficientOfVariation([0, 0, 0])).toBe(0);
  });

  it('builds a median report from unordered runs', () => {
    const slow = createPerfReport();
    const fast = createPerfReport();
    const middle = createPerfReport();
    slow.metrics.coldOpenMs = 1_100;
    fast.metrics.coldOpenMs = 900;

    const aggregate = aggregatePerfReports([slow, fast, middle]);

    expect(aggregate.report.metrics.coldOpenMs).toBe(1_000);
  });

  it('reports coefficient of variation for every measurement key', () => {
    const slow = createPerfReport();
    const fast = createPerfReport();
    const middle = createPerfReport();
    slow.metrics.coldOpenMs = 1_100;
    fast.metrics.coldOpenMs = 900;

    const aggregate = aggregatePerfReports([slow, fast, middle]);

    expect(aggregate.coefficientOfVariation['metrics.coldOpenMs'])
      .toBeCloseTo(0.1, 10);
    expect(aggregate.coefficientOfVariation['ratios.renameRatio']).toBe(0);
  });
});
