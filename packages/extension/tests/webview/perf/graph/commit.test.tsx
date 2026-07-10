import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PerfScopeVisibilitySnapshot } from '../../../../src/shared/perf/protocol';
import { useGraphPerfCommit } from '../../../../src/webview/perf/graph/commit';

const scopeVisibility: PerfScopeVisibilitySnapshot = {
  edgeVisibility: { import: true },
  nodeVisibility: { file: true, folder: false },
};

describe('webview/perf/graph/commit', () => {
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
      scopeVisibility,
    }, { cancelFrame, lifecycle, requestFrame }));

    expect(lifecycle.prepareCommit).toHaveBeenCalledWith({
      edgeCount: 2,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 3,
      scopeVisibility,
    });
    expect(lifecycle.publishCommit).not.toHaveBeenCalled();
    act(() => frameCallback?.(16));
    expect(lifecycle.publishCommit).toHaveBeenCalledWith(preparedCommit);
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

  it('cancels an unpublished graph event when the observer unmounts', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => ({ operation: {}, layoutChanged: false }) as never),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn(() => 59);
    const cancelFrame = vi.fn();
    const { unmount } = renderHook(() => useGraphPerfCommit({
      edgeCount: 0,
      layoutKey: undefined,
      nodeCount: 0,
      revision: {},
    }, { cancelFrame, lifecycle, requestFrame }));

    unmount();

    expect(cancelFrame).toHaveBeenCalledWith(59);
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
      ({ scopeVisibility }) => useGraphPerfCommit({
        edgeCount: 2,
        layoutKey: 'uniform::stable',
        nodeCount: 3,
        revision: graphRevision,
        scopeVisibility,
      }, { cancelFrame, lifecycle, requestFrame }),
      { initialProps: { scopeVisibility: firstScopeVisibility } },
    );

    const nextScopeVisibility: PerfScopeVisibilitySnapshot = {
      edgeVisibility: { import: true },
      nodeVisibility: { file: false },
    };
    rerender({ scopeVisibility: nextScopeVisibility });

    expect(lifecycle.prepareCommit).toHaveBeenCalledTimes(2);
    expect(lifecycle.prepareCommit).toHaveBeenLastCalledWith({
      edgeCount: 2,
      layoutKey: 'uniform::stable',
      nodeCount: 3,
      scopeVisibility: nextScopeVisibility,
    });
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(cancelFrame).not.toHaveBeenCalled();
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
