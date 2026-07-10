import type { PerfReport } from '../../report';
import { reduceBatchOperationMetric } from './batch';

export type OperationScenario =
  | 'single-save'
  | 'rename'
  | 'create'
  | 'delete'
  | 'batch-100';

export interface OperationMetricSample {
  metric: string;
  operationId?: string;
  value: number;
}

export type ScenarioMetricLookup = (
  scenario: OperationScenario,
) => readonly OperationMetricSample[];

const operationMetricScenarios = {
  save: 'single-save',
  rename: 'rename',
  create: 'create',
  delete: 'delete',
  batch100: 'batch-100',
} as const satisfies Readonly<Record<string, OperationScenario>>;

type CollectedOperationMetrics = Pick<
  PerfReport['metrics'],
  'incrementalRefreshMs' | 'watcherToGraphMs'
>;

function exactlyOneMetric(
  samples: readonly OperationMetricSample[],
  scenario: OperationScenario,
  metricName: string,
): number {
  const matches = samples.filter(sample => sample.metric === metricName);
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${metricName} metric for ${scenario}; found ${matches.length}`,
    );
  }
  return matches[0].value;
}

function maxScenarioMetric(
  samples: readonly OperationMetricSample[],
  scenario: OperationScenario,
  metricName: string,
): number {
  const values = samples
    .filter(sample => sample.metric === metricName)
    .map(sample => sample.value);
  if (values.length === 0) {
    throw new Error(
      `Expected at least one ${metricName} metric for ${scenario}; found 0`,
    );
  }
  return Math.max(...values);
}

function reduceOperationMetric(
  samples: readonly OperationMetricSample[],
  scenario: OperationScenario,
  metricName: string,
): number {
  if (scenario === 'single-save') {
    return exactlyOneMetric(samples, scenario, metricName);
  }
  return scenario === 'batch-100'
    ? reduceBatchOperationMetric(samples, metricName)
    : maxScenarioMetric(samples, scenario, metricName);
}

function collectMetric(
  lookup: ScenarioMetricLookup,
  metricName: string,
): PerfReport['metrics']['incrementalRefreshMs'] {
  return Object.fromEntries(
    Object.entries(operationMetricScenarios).map(([reportKey, scenario]) => [
      reportKey,
      reduceOperationMetric(lookup(scenario), scenario, metricName),
    ]),
  ) as PerfReport['metrics']['incrementalRefreshMs'];
}

export function collectOperationMetrics(
  lookup: ScenarioMetricLookup,
): CollectedOperationMetrics {
  return {
    incrementalRefreshMs: collectMetric(lookup, 'incrementalRefreshMs'),
    watcherToGraphMs: collectMetric(lookup, 'watcherToGraphMs'),
  };
}
