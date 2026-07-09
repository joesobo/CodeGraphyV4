import { describe, expect, it, vi } from 'vitest';

import { createWebviewPerfBridge } from '../../../src/webview/perf/bridge';
import type {
  PerfControlMessage,
  PerfEventInput,
  PerfOperation,
} from '../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'cold-open',
  dimension: 'small',
};

const armMessage: PerfControlMessage = {
  type: 'PERF_CONTROL',
  payload: { kind: 'arm-graph', operation },
};

function setup() {
  const postMessage = vi.fn();
  const bridge = createWebviewPerfBridge({ postMessage });
  return { bridge, postMessage };
}

describe('webview/perf/bridge', () => {
  it('does not emit events before an arm-graph control', () => {
    const { bridge, postMessage } = setup();

    expect(bridge.emit({ kind: 'physics-settled' })).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('rejects malformed performance controls', () => {
    const { bridge } = setup();

    expect(bridge.handleControl({
      ...armMessage,
      payload: {
        ...armMessage.payload,
        unexpected: true,
      },
    })).toBe(false);
    expect(bridge.isArmed()).toBe(false);
  });

  it('arms only after a valid arm-graph control', () => {
    const { bridge } = setup();

    expect(bridge.handleControl(armMessage)).toBe(true);
    expect(bridge.isArmed()).toBe(true);
  });

  it('rejects a scripted graph control before an operation is armed', () => {
    const { bridge } = setup();

    expect(bridge.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-interaction-burst',
        operationId: operation.operationId,
      },
    })).toBe(false);
  });

  it('accepts a scripted graph control only for the armed operation', () => {
    const { bridge } = setup();
    bridge.handleControl(armMessage);

    expect(bridge.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-idle-watch',
        operationId: 'operation-stale',
        durationMs: 1_000,
      },
    })).toBe(false);
    expect(bridge.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-idle-watch',
        operationId: operation.operationId,
        durationMs: 1_000,
      },
    })).toBe(true);
    expect(bridge.isArmed()).toBe(true);
  });

  it('emits graph events with the armed operation context', () => {
    const { bridge, postMessage } = setup();
    bridge.handleControl(armMessage);

    expect(bridge.emit({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 100,
      edgeCount: 75,
    })).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'graph-applied',
        layoutChanged: false,
        nodeCount: 100,
        edgeCount: 75,
      },
    });
  });

  it('exposes the currently armed operation for correlated async work', () => {
    const { bridge } = setup();
    bridge.handleControl(armMessage);

    expect(bridge.getArmedOperation()).toEqual(operation);
  });

  it('does not attribute stale async work to a replacement arm', () => {
    const { bridge, postMessage } = setup();
    bridge.handleControl(armMessage);
    const capturedOperation = bridge.getArmedOperation();
    if (!capturedOperation) {
      throw new Error('Expected the graph operation to be armed');
    }
    bridge.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'arm-graph',
        operation: { ...operation },
      },
    });

    expect(bridge.emitFor(capturedOperation, { kind: 'physics-settled' })).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('emits strict webview-origin metrics', () => {
    const { bridge, postMessage } = setup();
    bridge.handleControl(armMessage);

    expect(bridge.emit({
      kind: 'metric',
      metric: 'payloadBytes',
      value: 2_048,
      unit: 'bytes',
    })).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'metric',
        metric: 'payloadBytes',
        value: 2_048,
        unit: 'bytes',
      },
    });
  });

  it('rejects malformed event payloads', () => {
    const { bridge, postMessage } = setup();
    bridge.handleControl(armMessage);

    expect(bridge.emit({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: -1,
      edgeCount: 75,
    } as PerfEventInput)).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('disarms only when the operation id matches', () => {
    const { bridge } = setup();
    bridge.handleControl(armMessage);

    expect(bridge.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'disarm-graph', operationId: 'operation-stale' },
    })).toBe(true);
    expect(bridge.isArmed()).toBe(true);
    expect(bridge.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'disarm-graph', operationId: operation.operationId },
    })).toBe(true);
    expect(bridge.isArmed()).toBe(false);
  });
});
