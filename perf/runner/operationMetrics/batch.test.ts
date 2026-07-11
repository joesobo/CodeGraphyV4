import { describe, expect, it } from 'vitest';

import { reduceBatchOperationMetric } from './batch';
import type { OperationMetricSample } from './model';

function sample(
  metric: string,
  value: number,
  operationId?: string,
): OperationMetricSample {
  return { metric, operationId, value };
}

describe('batch operation metric reduction', () => {
  it('uses the median of the slower maximum in each add-delete pair', () => {
    expect(reduceBatchOperationMetric([
      sample('watcherToGraphMs', 10, 'run:batch:medium:0'),
      sample('watcherToGraphMs', 15, 'run:batch:medium:0'),
      sample('watcherToGraphMs', 30, 'run:batch:medium:1'),
      sample('watcherToGraphMs', 20, 'run:batch:medium:2'),
      sample('watcherToGraphMs', 25, 'run:batch:medium:3'),
      sample('watcherToGraphMs', 100, 'run:batch:medium:4'),
      sample('watcherToGraphMs', 10, 'run:batch:medium:5'),
      sample('incrementalRefreshMs', 999, 'run:batch:medium:5'),
      sample('watcherToGraphMs', 999),
    ], 'watcherToGraphMs')).toBe(30);
  });

  it('requires a measurement for every operation', () => {
    expect(() => reduceBatchOperationMetric([
      sample('watcherToGraphMs', 10, 'run:batch:medium:0'),
      sample('incrementalRefreshMs', 20, 'run:batch:medium:1'),
    ], 'watcherToGraphMs')).toThrow(
      'Expected at least one watcherToGraphMs metric for batch-100 operation run:batch:medium:1; found 0',
    );
  });

  it('rejects operation ordinals that cannot form consecutive pairs', () => {
    expect(() => reduceBatchOperationMetric([
      sample('watcherToGraphMs', 10, 'run:batch:medium:0'),
      sample('watcherToGraphMs', 20, 'run:batch:medium:1'),
      sample('watcherToGraphMs', 30, 'run:batch:medium:2'),
      sample('watcherToGraphMs', 40, 'run:batch:medium:3'),
      sample('watcherToGraphMs', 50, 'run:batch:medium:4'),
      sample('watcherToGraphMs', 60, 'run:batch:medium:6'),
    ], 'watcherToGraphMs')).toThrow(
      'Batch operation ordinals must be six consecutive values; found 0, 1, 2, 3, 4, 6',
    );
  });

  it('is independent of metric arrival order', () => {
    const samples = [
      sample('watcherToGraphMs', 10, 'run:batch:medium:0'),
      sample('watcherToGraphMs', 30, 'run:batch:medium:1'),
      sample('watcherToGraphMs', 20, 'run:batch:medium:2'),
      sample('watcherToGraphMs', 25, 'run:batch:medium:3'),
      sample('watcherToGraphMs', 40, 'run:batch:medium:4'),
      sample('watcherToGraphMs', 35, 'run:batch:medium:5'),
    ];

    expect(reduceBatchOperationMetric(samples, 'watcherToGraphMs')).toBe(
      reduceBatchOperationMetric(samples.reverse(), 'watcherToGraphMs'),
    );
  });
});
