import type {
  PerfMetricContext,
  PerfMetricDiagnosticEvent,
} from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import { createPerfMetricAggregation } from '../../../src/extension/perf/aggregation';

function metricEvent(
  context: Partial<PerfMetricContext> & Pick<PerfMetricContext, 'metric' | 'unit' | 'value'>,
): PerfMetricDiagnosticEvent {
  return {
    area: 'performance',
    event: 'metric',
    context: {
      runId: 'run-1',
      scenario: 'cold-open',
      operationId: 'operation-1',
      ...context,
    },
  };
}

describe('performance metric aggregation', () => {
  it('sums repeated tree-sitter parse timings for each dimension', () => {
    const aggregation = createPerfMetricAggregation({
      runId: 'run-1',
      operationId: 'operation-1',
    });

    aggregation.collect(metricEvent({
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 2,
      dimension: 'typescript',
    }));
    aggregation.collect(metricEvent({
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 3,
      dimension: 'python',
    }));
    aggregation.collect(metricEvent({
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 5,
      dimension: 'typescript',
    }));

    expect(aggregation.metrics()).toEqual([
      {
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 3,
        dimension: 'python',
        operationId: 'operation-1',
      },
      {
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 7,
        dimension: 'typescript',
        operationId: 'operation-1',
      },
    ]);
  });

  it('retains a target-file parse dimension alongside language totals', () => {
    const aggregation = createPerfMetricAggregation({
      runId: 'run-1',
      operationId: 'operation-1',
      treeSitterTargetFilePath: 'src/target.ts',
    });

    aggregation.collect(metricEvent({
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 2,
      dimension: 'typescript',
      filePath: 'src/other.ts',
    }));
    aggregation.collect(metricEvent({
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 3,
      dimension: 'typescript',
      filePath: 'src/target.ts',
    }));

    expect(aggregation.metrics()).toEqual([
      {
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 5,
        dimension: 'typescript',
        operationId: 'operation-1',
      },
      {
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 3,
        dimension: 'typescript:src/target.ts',
        operationId: 'operation-1',
      },
    ]);
  });

  it('retains each non-parse metric measurement', () => {
    const aggregation = createPerfMetricAggregation({
      runId: 'run-1',
      operationId: 'operation-1',
    });

    aggregation.collect(metricEvent({
      metric: 'graphBuildMs',
      unit: 'ms',
      value: 11,
      dimension: 'workspace-pipeline-analysis',
    }));
    aggregation.collect(metricEvent({
      metric: 'graphBuildMs',
      unit: 'ms',
      value: 7,
      dimension: 'workspace-pipeline-connections',
    }));
    aggregation.collect(metricEvent({ metric: 'cacheSaveMs', unit: 'ms', value: 4 }));
    aggregation.collect(metricEvent({ metric: 'cacheBytes', unit: 'bytes', value: 4_096 }));
    aggregation.collect(metricEvent({ metric: 'coldOpenMs', unit: 'ms', value: 25 }));

    expect(aggregation.metrics()).toHaveLength(5);
    expect(aggregation.metrics()).toEqual(expect.arrayContaining([
      {
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 11,
        dimension: 'workspace-pipeline-analysis',
        operationId: 'operation-1',
      },
      {
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 7,
        dimension: 'workspace-pipeline-connections',
        operationId: 'operation-1',
      },
      {
        metric: 'cacheSaveMs',
        unit: 'ms',
        value: 4,
        operationId: 'operation-1',
      },
      {
        metric: 'cacheBytes',
        unit: 'bytes',
        value: 4_096,
        operationId: 'operation-1',
      },
      {
        metric: 'coldOpenMs',
        unit: 'ms',
        value: 25,
        operationId: 'operation-1',
      },
    ]));
  });

  it('preserves duplicate non-parse measurements', () => {
    const aggregation = createPerfMetricAggregation({ runId: 'run-1' });
    const graphBuild = metricEvent({
      metric: 'graphBuildMs',
      unit: 'ms',
      value: 8,
      dimension: 'workspace-pipeline-analysis',
    });

    aggregation.collect(graphBuild);
    aggregation.collect(graphBuild);

    expect(aggregation.metrics()).toEqual([
      {
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 8,
        dimension: 'workspace-pipeline-analysis',
        operationId: 'operation-1',
      },
      {
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 8,
        dimension: 'workspace-pipeline-analysis',
        operationId: 'operation-1',
      },
    ]);
  });

  it('ignores metrics from a different run', () => {
    const aggregation = createPerfMetricAggregation({ runId: 'run-1' });

    aggregation.collect(metricEvent({
      runId: 'run-foreign',
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 100,
      dimension: 'typescript',
    }));
    aggregation.collect(metricEvent({
      runId: 'run-foreign',
      metric: 'cacheSaveMs',
      unit: 'ms',
      value: 200,
    }));
    aggregation.collect(metricEvent({
      metric: 'warmOpenMs',
      unit: 'ms',
      value: 20,
    }));

    expect(aggregation.metrics()).toEqual([
      {
        metric: 'warmOpenMs',
        unit: 'ms',
        value: 20,
        operationId: 'operation-1',
      },
    ]);
  });

  it('ignores metrics from a different operation when scoped', () => {
    const aggregation = createPerfMetricAggregation({
      runId: 'run-1',
      operationId: 'operation-1',
    });

    aggregation.collect(metricEvent({
      operationId: 'operation-2',
      metric: 'graphBuildMs',
      unit: 'ms',
      value: 100,
      dimension: 'workspace-pipeline-analysis',
    }));
    aggregation.collect(metricEvent({
      metric: 'graphBuildMs',
      unit: 'ms',
      value: 8,
      dimension: 'workspace-pipeline-analysis',
    }));

    expect(aggregation.metrics()).toEqual([
      {
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 8,
        dimension: 'workspace-pipeline-analysis',
        operationId: 'operation-1',
      },
    ]);
  });

  it('collects metrics without an operation identifier', () => {
    const aggregation = createPerfMetricAggregation({ runId: 'run-1' });

    aggregation.collect(metricEvent({
      operationId: undefined,
      metric: 'cacheSaveMs',
      unit: 'ms',
      value: 4,
    }));

    expect(aggregation.metrics()).toEqual([
      { metric: 'cacheSaveMs', unit: 'ms', value: 4 },
    ]);
  });

  it('keeps parse totals separate across unscoped operations', () => {
    const aggregation = createPerfMetricAggregation({ runId: 'run-1' });

    aggregation.collect(metricEvent({
      operationId: 'operation-1',
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 2,
      dimension: 'typescript',
    }));
    aggregation.collect(metricEvent({
      operationId: 'operation-2',
      metric: 'treeSitterParseMs',
      unit: 'ms',
      value: 3,
      dimension: 'typescript',
    }));

    expect(aggregation.metrics()).toEqual([
      {
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 2,
        dimension: 'typescript',
        operationId: 'operation-1',
      },
      {
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 3,
        dimension: 'typescript',
        operationId: 'operation-2',
      },
    ]);
  });

  it('orders output independently of event arrival order', () => {
    const events = [
      metricEvent({
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 7,
        dimension: 'workspace-pipeline-connections',
      }),
      metricEvent({ metric: 'cacheBytes', unit: 'bytes', value: 4_096 }),
      metricEvent({
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 3,
        dimension: 'python',
      }),
      metricEvent({ metric: 'coldOpenMs', unit: 'ms', value: 25 }),
      metricEvent({ metric: 'cacheSaveMs', unit: 'ms', value: 4 }),
      metricEvent({
        metric: 'treeSitterParseMs',
        unit: 'ms',
        value: 2,
        dimension: 'typescript',
      }),
      metricEvent({
        metric: 'graphBuildMs',
        unit: 'ms',
        value: 11,
        dimension: 'workspace-pipeline-analysis',
      }),
    ];
    const forward = createPerfMetricAggregation({ runId: 'run-1' });
    const reverse = createPerfMetricAggregation({ runId: 'run-1' });

    for (const event of events) forward.collect(event);
    for (const event of [...events].reverse()) reverse.collect(event);

    expect(forward.metrics()).toEqual(reverse.metrics());
    expect(forward.metrics().map(metric => `${metric.metric}:${metric.dimension ?? ''}`)).toEqual([
      'coldOpenMs:',
      'cacheSaveMs:',
      'cacheBytes:',
      'treeSitterParseMs:python',
      'treeSitterParseMs:typescript',
      'graphBuildMs:workspace-pipeline-analysis',
      'graphBuildMs:workspace-pipeline-connections',
    ]);
  });
});
