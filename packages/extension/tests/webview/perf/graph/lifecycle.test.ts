import { describe, expect, it, vi } from 'vitest';

import type {
  PerfOperation,
  PerfScopeVisibilitySnapshot,
} from '../../../../src/shared/perf/protocol';
import { createGraphPerfLifecycle } from '../../../../src/webview/perf/graph/lifecycle';

const operation: PerfOperation = {
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'single-save',
  dimension: 'medium',
};
const scopeVisibility: PerfScopeVisibilitySnapshot = {
  edgeVisibility: { import: true },
  nodeVisibility: { file: true, folder: false },
};

function setup(now = vi.fn(() => 100)) {
  const bridge = {
    emit: vi.fn(() => true),
    emitFor: vi.fn(() => true),
    getArmedOperation: vi.fn<() => PerfOperation | undefined>(() => operation),
  };
  const lifecycle = createGraphPerfLifecycle({ bridge, now });
  return { bridge, lifecycle, now };
}

describe('webview/perf/graph/lifecycle', () => {
  it('observes layout state without preparing an event while disarmed', () => {
    const { bridge, lifecycle } = setup();
    bridge.getArmedOperation.mockReturnValue(undefined);

    expect(lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    })).toBeUndefined();
    expect(bridge.emitFor).not.toHaveBeenCalled();
  });

  it('marks the first armed non-empty layout as changed', () => {
    const { lifecycle } = setup();

    expect(lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    })).toMatchObject({ layoutChanged: true });
  });

  it('keeps a layout change pending when its prepared frame is cancelled', () => {
    const { lifecycle } = setup();
    const input = {
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    };

    expect(lifecycle.prepareCommit(input)).toMatchObject({ layoutChanged: true });
    const replacementCommit = lifecycle.prepareCommit(input);
    expect(replacementCommit).toMatchObject({ layoutChanged: true });

    lifecycle.publishCommit(replacementCommit!);

    expect(lifecycle.prepareCommit(input)).toMatchObject({ layoutChanged: false });
  });

  it('does not mark a new payload with the same layout key as changed', () => {
    const { bridge, lifecycle } = setup();
    bridge.getArmedOperation.mockReturnValueOnce(undefined).mockReturnValue(operation);
    lifecycle.prepareCommit({ edgeCount: 1, layoutKey: 'uniform::a::edge-a', nodeCount: 1 });

    expect(lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    })).toMatchObject({ layoutChanged: false });
  });

  it('marks a different layout key as changed after the previous key is applied', () => {
    const { lifecycle } = setup();
    const firstCommit = lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    });
    lifecycle.publishCommit(firstCommit!);

    expect(lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::b::edge-b',
      nodeCount: 1,
    })).toMatchObject({ layoutChanged: true });
  });

  it('publishes graph application with the captured operation', () => {
    const { bridge, lifecycle } = setup();
    const commit = lifecycle.prepareCommit({
      edgeCount: 7,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 11,
      scopeVisibility,
    });

    expect(lifecycle.publishCommit(commit!)).toBe(true);
    expect(bridge.emitFor).toHaveBeenCalledWith(operation, {
      kind: 'graph-applied',
      layoutChanged: true,
      nodeCount: 11,
      edgeCount: 7,
      scopeVisibility,
    });
  });

  it('treats an empty graph as no layout so callers do not wait for physics', () => {
    const { lifecycle } = setup();

    expect(lifecycle.prepareCommit({
      edgeCount: 0,
      layoutKey: undefined,
      nodeCount: 0,
    })).toMatchObject({ layoutChanged: false });
  });

  it('records settle duration before publishing the correlated physics ack', () => {
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(175);
    const { bridge, lifecycle } = setup(now);
    const commit = lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    });
    lifecycle.publishCommit(commit!);
    bridge.emitFor.mockClear();

    expect(lifecycle.engineStopped()).toBe(true);
    expect(bridge.emitFor.mock.calls).toEqual([
      [operation, {
        kind: 'metric',
        metric: 'settleTimeMs',
        unit: 'ms',
        value: 75,
      }],
      [operation, { kind: 'physics-settled' }],
    ]);
  });

  it('does not publish a physics ack when the settle metric is rejected', () => {
    const { bridge, lifecycle } = setup();
    const commit = lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    });
    lifecycle.publishCommit(commit!);
    bridge.emitFor.mockClear();
    bridge.emitFor.mockReturnValueOnce(false);

    expect(lifecycle.engineStopped()).toBe(false);
    expect(bridge.emitFor).toHaveBeenCalledOnce();
  });

  it('does not wait for physics when graph application cannot be published', () => {
    const { bridge, lifecycle } = setup();
    const commit = lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    });
    bridge.emitFor.mockReturnValueOnce(false);

    expect(lifecycle.publishCommit(commit!)).toBe(false);
    expect(lifecycle.engineStopped()).toBe(false);
  });

  it('does not publish physics for a graph application without a layout change', () => {
    const { bridge, lifecycle } = setup();
    bridge.getArmedOperation.mockReturnValueOnce(undefined).mockReturnValue(operation);
    lifecycle.prepareCommit({ edgeCount: 1, layoutKey: 'uniform::a::edge-a', nodeCount: 1 });
    const commit = lifecycle.prepareCommit({
      edgeCount: 1,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 1,
    });
    lifecycle.publishCommit(commit!);
    bridge.emitFor.mockClear();

    expect(lifecycle.engineStopped()).toBe(false);
    expect(bridge.emitFor).not.toHaveBeenCalled();
  });

  it('emits layout reset metrics only when the physics hook reports a reset', () => {
    const { bridge, lifecycle } = setup();

    expect(lifecycle.layoutReset()).toBe(true);
    expect(bridge.emit).toHaveBeenCalledWith({
      kind: 'metric',
      metric: 'layoutResets',
      unit: 'count',
      value: 1,
    });
  });
});
