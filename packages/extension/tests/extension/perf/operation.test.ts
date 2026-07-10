import { describe, expect, it, vi } from 'vitest';

import {
  runCorrelatedGraphOperation,
  type CorrelatedGraphOperationRuntime,
} from '../../../src/extension/perf/operation';
import type {
  PerfControlMessage,
  PerfEventMessage,
  PerfOperation,
} from '../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  operationId: 'run-1:rename:small:0',
  runId: 'run-1',
  scenario: 'rename',
  dimension: 'small',
};

function graphApplied(layoutChanged: boolean, scopeProjectionRevision = 0): PerfEventMessage {
  return {
    type: 'PERF_EVENT',
    payload: {
      ...operation,
      kind: 'graph-applied',
      layoutChanged,
      nodeCount: 100,
      edgeCount: 75,
      scopeProjectionRevision,
    },
  };
}

function physicsSettled(scopeProjectionRevision = 0): PerfEventMessage {
  return {
    type: 'PERF_EVENT',
    payload: {
      ...operation,
      kind: 'physics-settled',
      scopeProjectionRevision,
    },
  };
}

function setup() {
  let listener: ((message: unknown) => void) | undefined;
  const controls: PerfControlMessage[] = [];
  const dispose = vi.fn();
  const metrics: unknown[] = [];
  const disposeMetricSession = vi.fn();
  const startMetricSession = vi.fn(() => ({ dispose: disposeMetricSession }));
  const runtime: CorrelatedGraphOperationRuntime = {
    emitMetric: metric => { metrics.push(metric); },
    now: vi.fn()
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(20)
      .mockReturnValueOnce(25),
    onMessage(handler) {
      listener = handler;
      return { dispose };
    },
    sendControl(message) {
      controls.push(message);
    },
    startMetricSession,
  };

  return {
    controls,
    dispose,
    emit(message: unknown): void {
      listener?.(message);
    },
    metrics,
    runtime,
    disposeMetricSession,
    startMetricSession,
  };
}

describe('extension/perf/operation', () => {
  it('arms before invoking the measured action', async () => {
    const harness = setup();
    const action = vi.fn(async () => {
      expect(harness.controls[0]).toEqual({
        type: 'PERF_CONTROL',
        payload: { kind: 'arm-graph', operation },
      });
      harness.emit(graphApplied(false));
    });

    await runCorrelatedGraphOperation(operation, action, harness.runtime);

    expect(action).toHaveBeenCalledOnce();
  });

  it('correlates Core metrics with the measured operation', async () => {
    const harness = setup();

    await runCorrelatedGraphOperation(operation, async () => {
      harness.emit(graphApplied(false));
    }, harness.runtime);

    expect(harness.startMetricSession).toHaveBeenCalledWith(operation);
    expect(harness.disposeMetricSession).toHaveBeenCalledOnce();
  });

  it('completes without waiting for physics when layout did not change', async () => {
    const harness = setup();

    const result = await runCorrelatedGraphOperation(operation, async () => {
      harness.emit(graphApplied(false));
    }, harness.runtime);

    expect(result).toEqual({
      elapsedMs: 15,
      graphAppliedMs: 10,
      graphApplied: graphApplied(false).payload,
    });
  });

  it('waits for physics when layout changed', async () => {
    const harness = setup();
    let completed = false;
    const pending = runCorrelatedGraphOperation(operation, async () => {
      harness.emit(graphApplied(true));
    }, harness.runtime).then(() => { completed = true; });

    await Promise.resolve();
    expect(completed).toBe(false);

    harness.emit(physicsSettled());
    await pending;
    expect(completed).toBe(true);
  });

  it('waits for physics matching the applied scope projection revision', async () => {
    const harness = setup();
    let completed = false;
    const pending = runCorrelatedGraphOperation(operation, async () => {
      harness.emit(graphApplied(true, 5));
    }, harness.runtime).then(() => { completed = true; });

    await Promise.resolve();
    expect(completed).toBe(false);

    harness.emit(physicsSettled(4));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(completed).toBe(false);

    harness.emit(physicsSettled(5));
    await pending;
    expect(completed).toBe(true);
  });

  it('ignores a matching physics event that preceded the applied graph commit', async () => {
    const harness = setup();
    let completed = false;
    const pending = runCorrelatedGraphOperation(operation, async () => {
      harness.emit(physicsSettled(5));
      harness.emit(graphApplied(true, 5));
    }, harness.runtime).then(() => { completed = true; });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(completed).toBe(false);

    harness.emit(physicsSettled(5));
    await pending;
    expect(completed).toBe(true);
  });

  it('forwards armed webview metrics to the diagnostics runtime', async () => {
    const harness = setup();

    await runCorrelatedGraphOperation(operation, async () => {
      harness.emit({
        type: 'PERF_EVENT',
        payload: {
          ...operation,
          kind: 'metric',
          metric: 'payloadBytes',
          value: 4096,
          unit: 'bytes',
        },
      });
      harness.emit(graphApplied(false));
    }, harness.runtime);

    expect(harness.metrics).toEqual([{
      ...operation,
      metric: 'payloadBytes',
      value: 4096,
      unit: 'bytes',
    }]);
  });

  it('ignores events from a stale operation', async () => {
    const harness = setup();
    let completed = false;
    const pending = runCorrelatedGraphOperation(operation, async () => {
      harness.emit({
        ...graphApplied(false),
        payload: {
          ...graphApplied(false).payload,
          operationId: 'stale-operation',
        },
      });
    }, harness.runtime).then(() => { completed = true; });

    await Promise.resolve();
    expect(completed).toBe(false);

    harness.emit(graphApplied(false));
    await pending;
  });

  it('disarms and unsubscribes when the measured action fails', async () => {
    const harness = setup();

    await expect(runCorrelatedGraphOperation(operation, async () => {
      throw new Error('mutation failed');
    }, harness.runtime)).rejects.toThrow('mutation failed');

    expect(harness.controls.at(-1)).toEqual({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'disarm-graph',
        operationId: operation.operationId,
      },
    });
    expect(harness.dispose).toHaveBeenCalledOnce();
  });

  it('rejects an operation that cannot be armed', async () => {
    const harness = setup();
    const invalidOperation = { ...operation, dimension: '' };

    await expect(runCorrelatedGraphOperation(
      invalidOperation,
      async () => {},
      harness.runtime,
    )).rejects.toThrow(`Unable to arm graph operation ${operation.operationId}`);
  });

  it('times out a missing graph acknowledgement', async () => {
    vi.useFakeTimers();
    const harness = setup();
    const pending = runCorrelatedGraphOperation(
      operation,
      async () => {},
      harness.runtime,
      { timeoutMs: 50 },
    );

    const assertion = expect(pending).rejects.toThrow(
      'Timed out waiting for graph application for run-1:rename:small:0',
    );
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(harness.dispose).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('identifies physics settlement as the missing acknowledgement phase', async () => {
    vi.useFakeTimers();
    const harness = setup();
    const pending = runCorrelatedGraphOperation(
      operation,
      async () => {
        harness.emit(graphApplied(true));
      },
      harness.runtime,
      { timeoutMs: 50 },
    );

    const assertion = expect(pending).rejects.toThrow(
      'Timed out waiting for physics settlement for run-1:rename:small:0',
    );
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    vi.useRealTimers();
  });
});
