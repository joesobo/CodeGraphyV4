import { median } from '../../baselines/statistics';
import type { OperationMetricSample } from './model';

export function reduceBatchOperationMetric(
  samples: readonly OperationMetricSample[],
  metricName: string,
): number {
  const operationIds = [...new Set(
    samples.flatMap(sample => sample.operationId ? [sample.operationId] : []),
  )];
  const maxima = operationIds.map((operationId) => {
    const values = samples
      .filter(sample =>
        sample.operationId === operationId
        && sample.metric === metricName)
      .map(sample => sample.value);
    if (values.length === 0) {
      throw new Error(
        `Expected at least one ${metricName} metric for batch-100 operation ${operationId}; found 0`,
      );
    }
    return Math.max(...values);
  });
  return median(maxima);
}
