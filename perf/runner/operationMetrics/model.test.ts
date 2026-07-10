import { describe, expect, it } from 'vitest';

import {
  collectOperationMetrics,
  type OperationMetricSample,
  type OperationScenario,
  type ScenarioMetricLookup,
} from './model';

function sample(
  metric: string,
  value: number,
  operationId = 'operation-0',
): OperationMetricSample {
  return { metric, operationId, value };
}

function measurements(): Record<OperationScenario, OperationMetricSample[]> {
  return {
    'single-save': [
      sample('incrementalRefreshMs', 10),
      sample('watcherToGraphMs', 20),
    ],
    rename: [
      sample('incrementalRefreshMs', 11),
      sample('incrementalRefreshMs', 15),
      sample('watcherToGraphMs', 21),
      sample('watcherToGraphMs', 25),
    ],
    create: [
      sample('incrementalRefreshMs', 12),
      sample('incrementalRefreshMs', 16),
      sample('watcherToGraphMs', 22),
      sample('watcherToGraphMs', 26),
    ],
    delete: [
      sample('incrementalRefreshMs', 13),
      sample('incrementalRefreshMs', 17),
      sample('watcherToGraphMs', 23),
      sample('watcherToGraphMs', 27),
    ],
    'batch-100': [
      sample('incrementalRefreshMs', 30, 'operation-0'),
      sample('incrementalRefreshMs', 35, 'operation-0'),
      sample('watcherToGraphMs', 40, 'operation-0'),
      sample('watcherToGraphMs', 45, 'operation-0'),
      sample('incrementalRefreshMs', 50, 'operation-1'),
      sample('watcherToGraphMs', 60, 'operation-1'),
      sample('watcherToGraphMs', 10, 'operation-1'),
      sample('incrementalRefreshMs', 40, 'operation-2'),
      sample('watcherToGraphMs', 50, 'operation-2'),
      { metric: 'watcherToGraphMs', value: 999 },
    ],
  };
}

function lookup(
  values: Record<OperationScenario, OperationMetricSample[]>,
): ScenarioMetricLookup {
  return scenario => values[scenario];
}

describe('operation metric collection', () => {
  it('uses one save, each file-operation maximum, and the median batch maximum', () => {
    expect(collectOperationMetrics(lookup(measurements()))).toEqual({
      incrementalRefreshMs: {
        save: 10,
        rename: 15,
        create: 16,
        delete: 17,
        batch100: 40,
      },
      watcherToGraphMs: {
        save: 20,
        rename: 25,
        create: 26,
        delete: 27,
        batch100: 50,
      },
    });
  });

  it.each([
    'incrementalRefreshMs',
    'watcherToGraphMs',
  ] as const)('requires one single-save %s measurement', (metricName) => {
    const values = measurements();
    values['single-save'] = values['single-save']
      .filter(entry => entry.metric !== metricName);

    expect(() => collectOperationMetrics(lookup(values))).toThrow(
      `Expected exactly one ${metricName} metric for single-save; found 0`,
    );
  });

  it.each([
    'incrementalRefreshMs',
    'watcherToGraphMs',
  ] as const)('rejects duplicate single-save %s measurements', (metricName) => {
    const values = measurements();
    values['single-save'].push(sample(metricName, 99));

    expect(() => collectOperationMetrics(lookup(values))).toThrow(
      `Expected exactly one ${metricName} metric for single-save; found 2`,
    );
  });

  it.each([
    ['rename', 'incrementalRefreshMs'],
    ['create', 'watcherToGraphMs'],
    ['delete', 'incrementalRefreshMs'],
  ] as const)('requires a %s operation metric for %s', (scenario, metricName) => {
    const values = measurements();
    values[scenario] = values[scenario]
      .filter(entry => entry.metric !== metricName);

    expect(() => collectOperationMetrics(lookup(values))).toThrow(
      `Expected at least one ${metricName} metric for ${scenario}; found 0`,
    );
  });

  it('requires a batch measurement for every operation', () => {
    const values = measurements();
    values['batch-100'] = values['batch-100'].filter(entry => !(
      entry.operationId === 'operation-1'
      && entry.metric === 'watcherToGraphMs'
    ));

    expect(() => collectOperationMetrics(lookup(values))).toThrow(
      'Expected at least one watcherToGraphMs metric for batch-100 operation operation-1; found 0',
    );
  });

  it('is independent of batch metric arrival order', () => {
    const values = measurements();
    const expected = collectOperationMetrics(lookup(values));
    values['batch-100'].reverse();

    expect(collectOperationMetrics(lookup(values))).toEqual(expected);
  });
});
