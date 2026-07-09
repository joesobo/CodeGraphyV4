import { describe, expect, it, vi } from 'vitest';

import type { PerfOperation } from '../../../../src/shared/perf/protocol';
import { createWebviewPerfBridge } from '../../../../src/webview/perf/bridge';
import {
  createWebviewGraphPerfControl,
  type GraphPerfScenarioTarget,
} from '../../../../src/webview/perf/graph/control';

const operation: PerfOperation = {
  dimension: 'medium',
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'single-save',
};

function setup() {
  const bridge = createWebviewPerfBridge({ postMessage: vi.fn() });
  const control = createWebviewGraphPerfControl({ bridge });
  const target: GraphPerfScenarioTarget = {
    cancel: vi.fn(),
    engineStopped: vi.fn(),
    engineTick: vi.fn(),
    startIdleWatch: vi.fn(),
    startInteractionBurst: vi.fn(),
  };
  control.attachTarget(target);
  return { bridge, control, target };
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
