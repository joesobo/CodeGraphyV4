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
    const ordinal = Number(operationId.match(/:(\d+)$/)?.[1]);
    return { ordinal, value: Math.max(...values) };
  });
  const ordered = maxima.sort((left, right) => left.ordinal - right.ordinal);
  const ordinals = ordered.map(entry => entry.ordinal);
  if (
    ordered.length !== 6
    || ordinals.some((ordinal, index) =>
      !Number.isInteger(ordinal)
      || ordinal !== ordinals[0] + index)
  ) {
    throw new Error(
      `Batch operation ordinals must be six consecutive values; found ${ordinals.join(', ')}`,
    );
  }
  const pairMaxima = [0, 2, 4].map(startIndex => Math.max(
    ordered[startIndex].value,
    ordered[startIndex + 1].value,
  ));
  return median(pairMaxima);
}
