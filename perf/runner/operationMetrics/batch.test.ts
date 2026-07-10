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
  it('uses the median of each operation maximum', () => {
    expect(reduceBatchOperationMetric([
      sample('watcherToGraphMs', 10, 'operation-0'),
      sample('watcherToGraphMs', 15, 'operation-0'),
      sample('watcherToGraphMs', 30, 'operation-1'),
      sample('watcherToGraphMs', 5, 'operation-1'),
      sample('watcherToGraphMs', 20, 'operation-2'),
      sample('incrementalRefreshMs', 99, 'operation-2'),
      sample('watcherToGraphMs', 999),
    ], 'watcherToGraphMs')).toBe(20);
  });

  it('requires a measurement for every operation', () => {
    expect(() => reduceBatchOperationMetric([
      sample('watcherToGraphMs', 10, 'operation-0'),
      sample('incrementalRefreshMs', 20, 'operation-1'),
    ], 'watcherToGraphMs')).toThrow(
      'Expected at least one watcherToGraphMs metric for batch-100 operation operation-1; found 0',
    );
  });

  it('is independent of metric arrival order', () => {
    const samples = [
      sample('watcherToGraphMs', 10, 'operation-0'),
      sample('watcherToGraphMs', 30, 'operation-1'),
      sample('watcherToGraphMs', 20, 'operation-2'),
    ];

    expect(reduceBatchOperationMetric(samples, 'watcherToGraphMs')).toBe(
      reduceBatchOperationMetric(samples.reverse(), 'watcherToGraphMs'),
    );
  });
});
