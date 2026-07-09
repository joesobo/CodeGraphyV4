import { describe, expect, it, vi } from 'vitest';

import {
  runCorrelatedControlOperation,
  type CorrelatedControlOperationRuntime,
} from '../../../src/extension/perf/controlOperation';
import type {
  PerfControlMessage,
  PerfEventMessage,
  PerfOperation,
} from '../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  operationId: 'run-1:interaction-burst:small:0',
  runId: 'run-1',
  scenario: 'interaction-burst',
  dimension: 'small',
};

function setup() {
  let listener: ((message: unknown) => void) | undefined;
  const controls: PerfControlMessage[] = [];
  const disposeMessage = vi.fn();
  const disposeSession = vi.fn();
  const emitMetric = vi.fn();
  const runtime: CorrelatedControlOperationRuntime = {
    emitMetric,
    now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(30),
    onMessage(handler) {
      listener = handler;
      return { dispose: disposeMessage };
    },
    sendControl(message) {
      controls.push(message);
    },
    startMetricSession: vi.fn(() => ({ dispose: disposeSession })),
  };

  return {
    controls,
    disposeMessage,
    disposeSession,
    emit(message: PerfEventMessage): void { listener?.(message); },
    emitMetric,
    runtime,
  };
}

describe('extension/perf/controlOperation', () => {
  it('arms before requesting the scripted webview control', async () => {
    const harness = setup();
    const start = vi.fn((bridge) => {
      expect(harness.controls[0]?.payload.kind).toBe('arm-graph');
      const started = bridge.runInteractionBurst();
      harness.emit({
        type: 'PERF_EVENT',
        payload: {
          ...operation,
          kind: 'interaction-complete',
          interaction: 'burst',
          durationMs: 20,
        },
      });
      return started;
    });

    await expect(runCorrelatedControlOperation(
      operation,
      'interaction-complete',
      start,
      harness.runtime,
    )).resolves.toMatchObject({ elapsedMs: 20 });
  });

  it('forwards metrics from the armed control operation', async () => {
    const harness = setup();

    await runCorrelatedControlOperation(
      operation,
      'interaction-complete',
      () => {
        harness.emit({
          type: 'PERF_EVENT',
          payload: {
            ...operation,
            kind: 'metric',
            metric: 'simTicksAfterSettle',
            value: 0,
            unit: 'count',
          },
        });
        harness.emit({
          type: 'PERF_EVENT',
          payload: {
            ...operation,
            kind: 'interaction-complete',
            interaction: 'burst',
            durationMs: 20,
          },
        });
        return true;
      },
      harness.runtime,
    );

    expect(harness.emitMetric).toHaveBeenCalledWith({
      ...operation,
      metric: 'simTicksAfterSettle',
      value: 0,
      unit: 'count',
    });
  });

  it('observes correlated lifecycle events before control completion', async () => {
    const harness = setup();
    const onEvent = vi.fn();

    await runCorrelatedControlOperation(
      operation,
      'interaction-complete',
      () => {
        harness.emit({
          type: 'PERF_EVENT',
          payload: {
            ...operation,
            kind: 'idle-started',
            durationMs: 60_000,
          },
        });
        harness.emit({
          type: 'PERF_EVENT',
          payload: {
            ...operation,
            kind: 'interaction-complete',
            interaction: 'burst',
            durationMs: 20,
          },
        });
        return true;
      },
      harness.runtime,
      { onEvent },
    );

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'idle-started',
      durationMs: 60_000,
    }));
  });

  it('disarms and restores the metric session after completion', async () => {
    const harness = setup();

    await runCorrelatedControlOperation(
      operation,
      'interaction-complete',
      () => {
        harness.emit({
          type: 'PERF_EVENT',
          payload: {
            ...operation,
            kind: 'interaction-complete',
            interaction: 'burst',
            durationMs: 20,
          },
        });
        return true;
      },
      harness.runtime,
    );

    expect(harness.controls.at(-1)).toEqual({
      type: 'PERF_CONTROL',
      payload: { kind: 'disarm-graph', operationId: operation.operationId },
    });
    expect(harness.disposeSession).toHaveBeenCalledOnce();
    expect(harness.disposeMessage).toHaveBeenCalledOnce();
  });
});
