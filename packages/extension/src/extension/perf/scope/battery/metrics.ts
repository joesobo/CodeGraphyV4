import type { PerfMetricContext } from '@codegraphy-dev/core';

import type { CorrelatedControlOperationRuntime } from '../../controlOperation';
import type {
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../shared/perf/protocol';
import { entryKey } from '../entries';

type MetricEvent = Extract<PerfEventPayload, { kind: 'metric' }>;
type MetricRuntime = Pick<CorrelatedControlOperationRuntime, 'emitMetric'>;

export interface ScopeMetricRecorder {
  markMeasured(operation: PerfOperation): void;
  receive(event: PerfEventPayload): void;
  recordToggle(
    entry: PerfScopeEntry,
    operation: PerfOperation,
    elapsedMs: number,
  ): void;
}

function asMetricContext(event: MetricEvent): PerfMetricContext {
  return {
    operationId: event.operationId,
    runId: event.runId,
    scenario: event.scenario,
    dimension: event.dimension,
    metric: event.metric,
    value: event.value,
    unit: event.unit,
  };
}

export function createScopeMetricRecorder(
  runtime: MetricRuntime,
): ScopeMetricRecorder {
  const measuredOperationIds = new Set<string>();

  return {
    markMeasured(operation): void {
      measuredOperationIds.add(operation.operationId);
    },

    receive(event): void {
      if (
        event.kind !== 'metric'
        || !measuredOperationIds.has(event.operationId)
      ) {
        return;
      }
      runtime.emitMetric(asMetricContext(event));
    },

    recordToggle(entry, operation, elapsedMs): void {
      runtime.emitMetric({
        operationId: operation.operationId,
        runId: operation.runId,
        scenario: operation.scenario,
        dimension: `${entryKey(entry)}:${entry.enabled ? 'enabled' : 'disabled'}`,
        metric: 'scopeToggleMs',
        unit: 'ms',
        value: elapsedMs,
      });
    },
  };
}
