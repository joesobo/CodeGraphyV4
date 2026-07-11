import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PerfScopeVisibilitySnapshot } from '../../../../src/shared/perf/protocol';
import { useGraphPerfCommit } from '../../../../src/webview/perf/graph/commit';

const scopeVisibility: PerfScopeVisibilitySnapshot = {
  edgeVisibility: { import: true },
  nodeVisibility: { file: true, folder: false },
};

describe('webview/perf/graph/commit', () => {
  it('publishes a stable scope projection after React commits without another frame', () => {
    const preparedCommit = {
      operation: { scenario: 'scope-toggle' },
      layoutChanged: false,
      scopeVisibility,
    } as never;
    const lifecycle = {
      prepareCommit: vi.fn(() => preparedCommit),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn();

    renderHook(() => useGraphPerfCommit({
      edgeCount: 0,
      layoutKey: 'uniform::stable',
      nodeCount: 0,
      revision: {},
      scopeProjectionRevision: 8,
      scopeVisibility,
    }, { cancelFrame: vi.fn(), lifecycle, requestFrame }));

    expect(requestFrame).not.toHaveBeenCalled();
    expect(lifecycle.publishCommit).toHaveBeenCalledWith(preparedCommit);
  });

  it('publishes a prepared graph event on the frame after React commits', () => {
    const preparedCommit = { operation: {}, layoutChanged: false } as never;
    const lifecycle = {
      prepareCommit: vi.fn(() => preparedCommit),
      publishCommit: vi.fn(),
    };
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 41;
    });
    const cancelFrame = vi.fn();

    renderHook(() => useGraphPerfCommit({
      edgeCount: 2,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 3,
      revision: {},
      scopeProjectionRevision: 7,
      scopeVisibility,
    }, { cancelFrame, lifecycle, requestFrame }));

    expect(lifecycle.prepareCommit).toHaveBeenCalledWith({
      edgeCount: 2,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 3,
      scopeProjectionRevision: 7,
      scopeVisibility,
    });
    expect(lifecycle.publishCommit).not.toHaveBeenCalled();
    act(() => frameCallback?.(16));
    expect(lifecycle.publishCommit).toHaveBeenCalledWith(preparedCommit);
  });

  it('keeps a layout-changing scope projection on the next-frame path', () => {
    const preparedCommit = {
      operation: { scenario: 'scope-toggle' },
      layoutChanged: true,
      scopeVisibility,
    } as never;
    const lifecycle = {
      prepareCommit: vi.fn(() => preparedCommit),
      publishCommit: vi.fn(),
    };
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 42;
    });

    renderHook(() => useGraphPerfCommit({
      edgeCount: 2,
      layoutKey: 'uniform::changed',
      nodeCount: 3,
      revision: {},
      scopeProjectionRevision: 9,
      scopeVisibility,
    }, { cancelFrame: vi.fn(), lifecycle, requestFrame }));

    expect(lifecycle.publishCommit).not.toHaveBeenCalled();
    act(() => frameCallback?.(16));
    expect(lifecycle.publishCommit).toHaveBeenCalledWith(preparedCommit);
  });

  it('settles a layout-changing commit immediately when simulation is disabled', () => {
    const preparedCommit = {
      operation: { scenario: 'scope-toggle' },
      layoutChanged: true,
      scopeVisibility,
    } as never;
    const lifecycle = {
      engineStopped: vi.fn(),
      prepareCommit: vi.fn(() => preparedCommit),
      publishCommit: vi.fn(() => true),
    };
    let frameCallback: FrameRequestCallback | undefined;

    renderHook(() => useGraphPerfCommit({
      edgeCount: 2,
      layoutKey: 'uniform::oversized',
      nodeCount: 10_000,
      revision: {},
      scopeProjectionRevision: 10,
      scopeVisibility,
      simulationEnabled: false,
    }, {
      cancelFrame: vi.fn(),
      lifecycle,
      requestFrame: vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 43;
      }),
    }));

    act(() => frameCallback?.(16));

    expect(lifecycle.publishCommit).toHaveBeenCalledWith(preparedCommit);
    expect(lifecycle.engineStopped).toHaveBeenCalledOnce();
  });

  it('does not request a frame while capture is disarmed', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => undefined),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn();

    renderHook(() => useGraphPerfCommit({
      edgeCount: 0,
      layoutKey: undefined,
      nodeCount: 0,
      revision: {},
    }, { cancelFrame: vi.fn(), lifecycle, requestFrame }));

    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('coalesces a newer graph revision into the pending frame', () => {
    const firstCommit = { operation: { operationId: 'first' }, layoutChanged: false } as never;
    const nextCommit = { operation: { operationId: 'next' }, layoutChanged: false } as never;
    const lifecycle = {
      prepareCommit: vi.fn()
        .mockReturnValueOnce(firstCommit)
        .mockReturnValueOnce(nextCommit),
      publishCommit: vi.fn(),
    };
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 57;
    });
    const cancelFrame = vi.fn();
    const firstRevision = {};
    const { rerender } = renderHook(
      ({ revision }) => useGraphPerfCommit({
        edgeCount: 0,
        layoutKey: undefined,
        nodeCount: 0,
        revision,
      }, { cancelFrame, lifecycle, requestFrame }),
      { initialProps: { revision: firstRevision } },
    );

    rerender({ revision: {} });

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(cancelFrame).not.toHaveBeenCalled();
    act(() => frameCallback?.(16));
    expect(lifecycle.publishCommit).toHaveBeenCalledWith(nextCommit);
    expect(lifecycle.publishCommit).not.toHaveBeenCalledWith(firstCommit);
  });

  it('preserves a pending layout change when the latest coalesced commit reverts it', () => {
    const firstCommit = { operation: {}, layoutChanged: true } as never;
    const revertedCommit = { operation: {}, layoutChanged: false } as never;
    const lifecycle = {
      prepareCommit: vi.fn()
        .mockReturnValueOnce(firstCommit)
        .mockReturnValueOnce(revertedCommit),
      publishCommit: vi.fn(),
    };
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 58;
    });
    const cancelFrame = vi.fn();
    const { rerender } = renderHook(
      ({ revision }) => useGraphPerfCommit({
        edgeCount: 0,
        layoutKey: undefined,
        nodeCount: 0,
        revision,
      }, { cancelFrame, lifecycle, requestFrame }),
      { initialProps: { revision: {} } },
    );

    rerender({ revision: {} });
    expect(requestFrame).toHaveBeenCalledOnce();
    act(() => frameCallback?.(16));

    expect(lifecycle.publishCommit).toHaveBeenCalledWith({
      operation: {},
      layoutChanged: true,
    });
  });

  it('cancels an unpublished graph event when the observer unmounts', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => ({ operation: {}, layoutChanged: false }) as never),
      publishCommit: vi.fn(),
    };
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 59;
    });
    const cancelFrame = vi.fn();
    const { unmount } = renderHook(() => useGraphPerfCommit({
      edgeCount: 0,
      layoutKey: undefined,
      nodeCount: 0,
      revision: {},
    }, { cancelFrame, lifecycle, requestFrame }));

    unmount();
    act(() => frameCallback?.(16));

    expect(cancelFrame).toHaveBeenCalledWith(59);
    expect(lifecycle.publishCommit).not.toHaveBeenCalled();
  });

  it('cancels a prepared commit when capture becomes disarmed before its frame', () => {
    const lifecycle = {
      prepareCommit: vi.fn()
        .mockReturnValueOnce({ operation: {}, layoutChanged: false } as never)
        .mockReturnValueOnce(undefined),
      publishCommit: vi.fn(),
    };
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 60;
    });
    const cancelFrame = vi.fn();
    const { rerender } = renderHook(
      ({ revision }) => useGraphPerfCommit({
        edgeCount: 0,
        layoutKey: undefined,
        nodeCount: 0,
        revision,
      }, { cancelFrame, lifecycle, requestFrame }),
      { initialProps: { revision: {} } },
    );

    rerender({ revision: {} });
    act(() => frameCallback?.(16));

    expect(cancelFrame).toHaveBeenCalledWith(60);
    expect(lifecycle.publishCommit).not.toHaveBeenCalled();
  });

  it('cancels with the previous frame dependency when that dependency changes', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => ({ operation: {}, layoutChanged: false }) as never),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn(() => 63);
    const firstCancelFrame = vi.fn();
    const nextCancelFrame = vi.fn();
    const { rerender } = renderHook(
      ({ cancelFrame }) => useGraphPerfCommit({
        edgeCount: 0,
        layoutKey: undefined,
        nodeCount: 0,
        revision: {},
      }, { cancelFrame, lifecycle, requestFrame }),
      { initialProps: { cancelFrame: firstCancelFrame } },
    );

    rerender({ cancelFrame: nextCancelFrame });

    expect(firstCancelFrame).toHaveBeenCalledWith(63);
    expect(nextCancelFrame).not.toHaveBeenCalled();
    expect(requestFrame).toHaveBeenCalledTimes(2);
  });

  it('schedules a commit when only the applied scope visibility changes', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => ({ operation: {}, layoutChanged: false }) as never),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn(() => 61);
    const cancelFrame = vi.fn();
    const graphRevision = {};
    const firstScopeVisibility: PerfScopeVisibilitySnapshot = {
      edgeVisibility: { import: true },
      nodeVisibility: { file: true },
    };
    const { rerender } = renderHook(
      ({ scopeProjectionRevision, scopeVisibility }) => useGraphPerfCommit({
        edgeCount: 2,
        layoutKey: 'uniform::stable',
        nodeCount: 3,
        revision: graphRevision,
        scopeProjectionRevision,
        scopeVisibility,
      }, { cancelFrame, lifecycle, requestFrame }),
      {
        initialProps: {
          scopeProjectionRevision: 4,
          scopeVisibility: firstScopeVisibility,
        },
      },
    );

    const nextScopeVisibility: PerfScopeVisibilitySnapshot = {
      edgeVisibility: { import: true },
      nodeVisibility: { file: false },
    };
    rerender({ scopeProjectionRevision: 5, scopeVisibility: nextScopeVisibility });

    expect(lifecycle.prepareCommit).toHaveBeenCalledTimes(2);
    expect(lifecycle.prepareCommit).toHaveBeenLastCalledWith({
      edgeCount: 2,
      layoutKey: 'uniform::stable',
      nodeCount: 3,
      scopeProjectionRevision: 5,
      scopeVisibility: nextScopeVisibility,
    });
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(cancelFrame).not.toHaveBeenCalled();
  });

  it('schedules a commit when only the scope projection revision changes', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => ({ operation: {}, layoutChanged: false }) as never),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn(() => 62);
    const graphRevision = {};
    const { rerender } = renderHook(
      ({ scopeProjectionRevision }) => useGraphPerfCommit({
        edgeCount: 2,
        layoutKey: 'uniform::stable',
        nodeCount: 3,
        revision: graphRevision,
        scopeProjectionRevision,
        scopeVisibility,
      }, { cancelFrame: vi.fn(), lifecycle, requestFrame }),
      { initialProps: { scopeProjectionRevision: 4 } },
    );

    rerender({ scopeProjectionRevision: 5 });

    expect(lifecycle.prepareCommit).toHaveBeenCalledTimes(2);
    expect(lifecycle.prepareCommit).toHaveBeenLastCalledWith({
      edgeCount: 2,
      layoutKey: 'uniform::stable',
      nodeCount: 3,
      scopeProjectionRevision: 5,
      scopeVisibility,
    });
  });

  it('does not observe a non-empty parent fallback handled by the graph component', () => {
    const lifecycle = {
      prepareCommit: vi.fn(),
      publishCommit: vi.fn(),
    };

    renderHook(() => useGraphPerfCommit({
      edgeCount: 0,
      enabled: false,
      layoutKey: undefined,
      nodeCount: 0,
      revision: {},
    }, { cancelFrame: vi.fn(), lifecycle, requestFrame: vi.fn() }));

    expect(lifecycle.prepareCommit).not.toHaveBeenCalled();
  });
});
