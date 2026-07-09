import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useGraphPerfCommit } from '../../../../src/webview/perf/graph/commit';

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
    }, { cancelFrame, lifecycle, requestFrame }));

    expect(lifecycle.prepareCommit).toHaveBeenCalledWith({
      edgeCount: 2,
      layoutKey: 'uniform::a::edge-a',
      nodeCount: 3,
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

  it('cancels an unpublished graph event when a newer commit replaces it', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => ({ operation: {}, layoutChanged: false }) as never),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn(() => 57);
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

    expect(cancelFrame).toHaveBeenCalledWith(57);
  });

  it('schedules a commit when only the scope projection revision changes', () => {
    const lifecycle = {
      prepareCommit: vi.fn(() => ({ operation: {}, layoutChanged: false }) as never),
      publishCommit: vi.fn(),
    };
    const requestFrame = vi.fn(() => 61);
    const cancelFrame = vi.fn();
    const graphRevision = {};
    const firstProjectionRevision = {};
    const { rerender } = renderHook(
      ({ projectionRevision }) => useGraphPerfCommit({
        edgeCount: 2,
        layoutKey: 'uniform::stable',
        nodeCount: 3,
        projectionRevision,
        revision: graphRevision,
      }, { cancelFrame, lifecycle, requestFrame }),
      { initialProps: { projectionRevision: firstProjectionRevision } },
    );

    rerender({ projectionRevision: {} });

    expect(lifecycle.prepareCommit).toHaveBeenCalledTimes(2);
    expect(lifecycle.prepareCommit).toHaveBeenLastCalledWith({
      edgeCount: 2,
      layoutKey: 'uniform::stable',
      nodeCount: 3,
    });
    expect(requestFrame).toHaveBeenCalledTimes(2);
    expect(cancelFrame).toHaveBeenCalledWith(61);
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
