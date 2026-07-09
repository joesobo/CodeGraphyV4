import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PerfOperation } from '../../../../src/shared/perf/protocol';
import type { GraphPerfScenarioTarget } from '../../../../src/webview/perf/graph/control';
import { useGraphPerfScenarios } from '../../../../src/webview/perf/graph/useScenarios';

const operation: PerfOperation = {
  dimension: 'medium',
  operationId: 'idle-1',
  runId: 'run-1',
  scenario: 'idle-watch',
};

describe('webview/perf/graph/useScenarios', () => {
  it('uses no frames or timers until an explicit armed command reaches its target', () => {
    let target: GraphPerfScenarioTarget | undefined;
    const requestFrame = vi.fn();
    const setTimer = vi.fn();
    const control = {
      attachTarget: vi.fn((next: GraphPerfScenarioTarget) => {
        target = next;
        return vi.fn();
      }),
    };

    const { result } = renderHook(() => useGraphPerfScenarios({
      getContainer: () => null,
      getGraph: () => undefined,
      getNodes: () => [],
      graphMode: '2d',
      handleNodeDrag: vi.fn(),
      handleNodeDragEnd: vi.fn(),
      zoomGraphView: vi.fn(),
    }, {
      bridge: { emitFor: vi.fn(() => true) },
      cancelFrame: vi.fn(),
      clearTimer: vi.fn(),
      control,
      now: () => 0,
      requestFrame,
      setTimer,
    }));

    expect(target).toBeDefined();
    expect(result.current).toBeUndefined();
    expect(requestFrame).not.toHaveBeenCalled();
    expect(setTimer).not.toHaveBeenCalled();
  });

  it('installs the engine tick callback only while idle work is active', () => {
    let target: GraphPerfScenarioTarget | undefined;
    const detach = vi.fn();
    const control = {
      attachTarget: (next: GraphPerfScenarioTarget) => {
        target = next;
        return detach;
      },
    };
    const { result, unmount } = renderHook(() => useGraphPerfScenarios({
      getContainer: () => null,
      getGraph: () => undefined,
      getNodes: () => [],
      graphMode: '2d',
      handleNodeDrag: vi.fn(),
      handleNodeDragEnd: vi.fn(),
      zoomGraphView: vi.fn(),
    }, {
      bridge: { emitFor: vi.fn(() => true) },
      cancelFrame: vi.fn(),
      clearTimer: vi.fn(),
      control,
      now: () => 0,
      requestFrame: vi.fn(),
      setTimer: vi.fn(),
    }));

    act(() => target?.startIdleWatch(operation, 1_000));
    expect(result.current).toEqual(expect.any(Function));

    unmount();
    expect(detach).toHaveBeenCalledOnce();
  });
});
