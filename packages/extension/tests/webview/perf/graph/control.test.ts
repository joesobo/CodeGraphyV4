import { describe, expect, it, vi } from 'vitest';

import type { PerfOperation } from '../../../../src/shared/perf/protocol';
import { createWebviewPerfBridge } from '../../../../src/webview/perf/bridge';
import {
  createWebviewGraphPerfControl,
  type GraphPerfScenarioTarget,
  type ScopePerfScenarioTarget,
} from '../../../../src/webview/perf/graph/control';

const operation: PerfOperation = {
  dimension: 'medium',
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'single-save',
};

function setup() {
  const postMessage = vi.fn();
  const bridge = createWebviewPerfBridge({ postMessage });
  const control = createWebviewGraphPerfControl({ bridge });
  const target: GraphPerfScenarioTarget = {
    cancel: vi.fn(),
    engineStopped: vi.fn(),
    engineTick: vi.fn(),
    startIdleWatch: vi.fn(),
    startInteractionBurst: vi.fn(),
  };
  const scopeTarget: ScopePerfScenarioTarget = {
    cancel: vi.fn(),
    graphControlsUpdated: vi.fn(),
    requestInventory: vi.fn(),
    toggle: vi.fn(() => true),
  };
  control.attachTarget(target);
  const detachScopeTarget = control.attachScopeTarget(scopeTarget);
  return { bridge, control, detachScopeTarget, postMessage, scopeTarget, target };
}

describe('webview/perf/graph/control', () => {
  it('dispatches an explicit burst command without inferring from the scenario name', () => {
    const { control, target } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });

    expect(control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-interaction-burst',
        operationId: operation.operationId,
      },
    })).toBe(true);
    expect(target.startInteractionBurst).toHaveBeenCalledWith(
      expect.objectContaining(operation),
    );
  });

  it('replays a burst command that arrives before the graph target attaches', () => {
    const bridge = createWebviewPerfBridge({ postMessage: vi.fn() });
    const control = createWebviewGraphPerfControl({ bridge });
    const target: GraphPerfScenarioTarget = {
      cancel: vi.fn(),
      engineStopped: vi.fn(),
      engineTick: vi.fn(),
      startIdleWatch: vi.fn(),
      startInteractionBurst: vi.fn(),
    };
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-interaction-burst',
        operationId: operation.operationId,
      },
    });
    expect(target.startInteractionBurst).not.toHaveBeenCalled();

    control.attachTarget(target);

    expect(target.startInteractionBurst).toHaveBeenCalledWith(
      expect.objectContaining(operation),
    );
  });

  it('does not dispatch a command for a different operation', () => {
    const { control, target } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });

    expect(control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-interaction-burst',
        operationId: 'operation-stale',
      },
    })).toBe(false);
    expect(target.startInteractionBurst).not.toHaveBeenCalled();
  });

  it('defaults an idle watch command to sixty seconds', () => {
    const { control, target } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-idle-watch',
        operationId: operation.operationId,
      },
    });

    expect(target.startIdleWatch).toHaveBeenCalledWith(
      expect.objectContaining(operation),
      60_000,
    );
  });

  it('starts an idle watch immediately when the oversized graph already stopped', () => {
    const { control, target } = setup();
    control.engineStopped();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });
    vi.mocked(target.engineStopped).mockClear();

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-idle-watch',
        operationId: operation.operationId,
        durationMs: 1_000,
      },
    });

    expect(target.startIdleWatch).toHaveBeenCalledWith(
      expect.objectContaining(operation),
      1_000,
    );
    expect(target.engineStopped).toHaveBeenCalledOnce();
  });

  it('dispatches explicit scope inventory and toggle commands', () => {
    const { control, scopeTarget } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'request-scope-inventory',
        operationId: operation.operationId,
      },
    });
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'toggle-scope',
        operationId: operation.operationId,
        scopeKind: 'edge',
        scopeId: 'imports',
        enabled: false,
      },
    });

    expect(scopeTarget.requestInventory).toHaveBeenCalledWith(expect.objectContaining(operation));
    expect(scopeTarget.toggle).toHaveBeenCalledWith(expect.objectContaining(operation), {
      scopeKind: 'edge',
      scopeId: 'imports',
      enabled: false,
    });
  });

  it('emits a correlated rejection when no scope target is attached', () => {
    const { control, detachScopeTarget, postMessage } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });
    detachScopeTarget();

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'toggle-scope',
        operationId: operation.operationId,
        scopeKind: 'node',
        scopeId: 'file',
        enabled: false,
      },
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'scope-toggle-rejected',
        scopeKind: 'node',
        scopeId: 'file',
        enabled: false,
        reason: 'target-unavailable',
      },
    });
  });

  it('emits a correlated rejection when inventory has no scope target', () => {
    const { control, detachScopeTarget, postMessage } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });
    detachScopeTarget();

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'request-scope-inventory',
        operationId: operation.operationId,
      },
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'scope-inventory-rejected',
        reason: 'target-unavailable',
      },
    });
  });

  it('emits a correlated rejection when the scope target declines a toggle', () => {
    const { control, postMessage, scopeTarget } = setup();
    vi.mocked(scopeTarget.toggle).mockReturnValue(false);
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'toggle-scope',
        operationId: operation.operationId,
        scopeKind: 'edge',
        scopeId: 'imports',
        enabled: true,
      },
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'scope-toggle-rejected',
        scopeKind: 'edge',
        scopeId: 'imports',
        enabled: true,
        reason: 'toggle-unavailable',
      },
    });
  });

  it('forwards graph-control host echoes to the scope target', () => {
    const { control, scopeTarget } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });
    const payload = {
      nodeTypes: [],
      edgeTypes: [],
      nodeColors: {},
      nodeVisibility: {},
      edgeVisibility: {},
    };

    control.handleExtensionMessage({ type: 'GRAPH_CONTROLS_UPDATED', payload });

    expect(scopeTarget.graphControlsUpdated).toHaveBeenCalledWith(payload);
  });

  it('does not inspect graph-control echoes while performance collection is disarmed', () => {
    const { control, scopeTarget } = setup();

    expect(control.handleExtensionMessage({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: {
        nodeTypes: [],
        edgeTypes: [],
        nodeColors: {},
        nodeVisibility: {},
        edgeVisibility: {},
      },
    })).toBe(false);
    expect(scopeTarget.graphControlsUpdated).not.toHaveBeenCalled();
  });

  it('cancels in-flight work before replacing the armed operation', () => {
    const { control, target } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });
    vi.mocked(target.cancel).mockClear();

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'arm-graph',
        operation: { ...operation },
      },
    });

    expect(target.cancel).toHaveBeenCalledOnce();
  });

  it('cancels in-flight work when the armed operation is disarmed', () => {
    const { control, target } = setup();
    control.handleControl({
      type: 'PERF_CONTROL',
      payload: { kind: 'arm-graph', operation },
    });
    vi.mocked(target.cancel).mockClear();

    control.handleControl({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'disarm-graph',
        operationId: operation.operationId,
      },
    });

    expect(target.cancel).toHaveBeenCalledOnce();
  });

  it('cancels the target when its graph surface unmounts', () => {
    const { control, target } = setup();
    vi.mocked(target.cancel).mockClear();
    const replacement = { ...target, cancel: vi.fn() };
    const detach = control.attachTarget(replacement);

    detach();

    expect(replacement.cancel).toHaveBeenCalledOnce();
    expect(control.getTarget()).toBeUndefined();
  });
});
