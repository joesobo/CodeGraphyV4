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
});
