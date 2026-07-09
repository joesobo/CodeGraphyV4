import { describe, expect, it, vi } from 'vitest';

import { createExtensionPerfBridge } from '../../../src/extension/perf/bridge';
import type {
  PerfEventMessage,
  PerfOperation,
} from '../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'cold-open',
  dimension: 'small',
};

const matchingEvent: PerfEventMessage = {
  type: 'PERF_EVENT',
  payload: {
    ...operation,
    kind: 'graph-applied',
    layoutChanged: true,
    nodeCount: 100,
    edgeCount: 75,
  },
};

function setup(enabled = true) {
  const sendControl = vi.fn();
  const onEvent = vi.fn();
  const bridge = createExtensionPerfBridge({ enabled, sendControl, onEvent });

  return { bridge, onEvent, sendControl };
}

describe('extension/perf/bridge', () => {
  it('stays inert when performance collection is disabled', () => {
    const { bridge, onEvent, sendControl } = setup(false);

    expect(bridge.armGraph(operation)).toBe(false);
    expect(bridge.handleMessage(matchingEvent)).toBe(false);
    expect(sendControl).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('arms a graph operation through PERF_CONTROL', () => {
    const { bridge, sendControl } = setup();

    expect(bridge.armGraph(operation)).toBe(true);
    expect(bridge.isArmed()).toBe(true);
    expect(sendControl).toHaveBeenCalledWith({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });
  });

  it('rejects an invalid graph operation', () => {
    const { bridge, sendControl } = setup();

    expect(bridge.armGraph({ ...operation, runId: '' })).toBe(false);
    expect(sendControl).not.toHaveBeenCalled();
  });

  it('forwards an event for the armed operation', () => {
    const { bridge, onEvent } = setup();
    bridge.armGraph(operation);

    expect(bridge.handleMessage(matchingEvent)).toBe(true);
    expect(onEvent).toHaveBeenCalledWith(matchingEvent.payload);
  });

  it('ignores an event for a stale operation', () => {
    const { bridge, onEvent } = setup();
    bridge.armGraph(operation);

    expect(bridge.handleMessage({
      ...matchingEvent,
      payload: {
        ...matchingEvent.payload,
        operationId: 'operation-stale',
      },
    })).toBe(false);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('rejects a malformed PERF_EVENT', () => {
    const { bridge, onEvent } = setup();
    bridge.armGraph(operation);

    expect(bridge.handleMessage({
      ...matchingEvent,
      payload: {
        ...matchingEvent.payload,
        unexpected: true,
      },
    })).toBe(false);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('disarms the current graph operation', () => {
    const { bridge, sendControl } = setup();
    bridge.armGraph(operation);

    expect(bridge.disarmGraph()).toBe(true);
    expect(bridge.isArmed()).toBe(false);
    expect(sendControl).toHaveBeenLastCalledWith({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'disarm-graph',
        operationId: operation.operationId,
      },
    });
  });

  it('requests an interaction burst for the armed operation', () => {
    const { bridge, sendControl } = setup();
    bridge.armGraph(operation);

    expect(bridge.runInteractionBurst()).toBe(true);
    expect(sendControl).toHaveBeenLastCalledWith({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-interaction-burst',
        operationId: operation.operationId,
      },
    });
  });

  it('requests a bounded idle watch for the armed operation', () => {
    const { bridge, sendControl } = setup();
    bridge.armGraph(operation);

    expect(bridge.runIdleWatch(60_000)).toBe(true);
    expect(sendControl).toHaveBeenLastCalledWith({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-idle-watch',
        operationId: operation.operationId,
        durationMs: 60_000,
      },
    });
  });

  it('requests the current scope inventory for the armed operation', () => {
    const { bridge, sendControl } = setup();
    bridge.armGraph(operation);

    expect(bridge.requestScopeInventory()).toBe(true);
    expect(sendControl).toHaveBeenLastCalledWith({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'request-scope-inventory',
        operationId: operation.operationId,
      },
    });
  });

  it('requests one scope toggle for the armed operation', () => {
    const { bridge, sendControl } = setup();
    bridge.armGraph(operation);

    expect(bridge.toggleScope({
      scopeKind: 'edge',
      scopeId: 'imports',
      enabled: false,
    })).toBe(true);
    expect(sendControl).toHaveBeenLastCalledWith({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'toggle-scope',
        operationId: operation.operationId,
        scopeKind: 'edge',
        scopeId: 'imports',
        enabled: false,
      },
    });
  });

  it('accepts a row-specific dimension for a correlated scope metric', () => {
    const { bridge, onEvent } = setup();
    bridge.armGraph(operation);

    expect(bridge.handleMessage({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        dimension: 'node:file',
        kind: 'metric',
        metric: 'scopeToggleMs',
        unit: 'ms',
        value: 12,
      },
    })).toBe(true);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      dimension: 'node:file',
      metric: 'scopeToggleMs',
    }));
  });
});
