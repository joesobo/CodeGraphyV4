import { describe, expect, it, vi } from 'vitest';

import { createScopeMetricRecorder } from '../../../../../src/extension/perf/scope/battery/metrics';
import type {
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  dimension: 'medium',
  operationId: 'run-1:scope-toggle:medium:1',
  runId: 'run-1',
  scenario: 'scope-toggle',
};

function layoutReset(operationId: string): PerfEventPayload {
  return {
    ...operation,
    operationId,
    kind: 'metric',
    metric: 'layoutResets',
    unit: 'count',
    value: 1,
  };
}

describe('extension/perf/scope/battery/metrics', () => {
  it('records bridge and toggle metrics only for marked measurement operations', () => {
    const emitMetric = vi.fn();
    const recorder = createScopeMetricRecorder({ emitMetric });
    const entry: PerfScopeEntry = {
      scopeKind: 'node',
      scopeId: 'file',
      enabled: false,
    };

    recorder.receive(layoutReset('unmeasured-operation'));
    recorder.markMeasured(operation);
    recorder.receive(layoutReset(operation.operationId));
    recorder.recordToggle(entry, operation, 12);

    expect(emitMetric).toHaveBeenCalledTimes(2);
    expect(emitMetric.mock.calls.map(([metric]) => metric)).toEqual([
      expect.objectContaining({
        metric: 'layoutResets',
        operationId: operation.operationId,
        value: 1,
      }),
      expect.objectContaining({
        dimension: 'node:file:disabled',
        metric: 'scopeToggleMs',
        operationId: operation.operationId,
        value: 12,
      }),
    ]);
  });
});
