import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildGraphDebugSnapshot,
  installGraphDebugApi,
  useGraphDebugApi,
} from '../../../src/webview/components/graph/debug';

describe('webview/graph/debug', () => {
  it('builds a snapshot from container and node coordinates', () => {
    const containerRef = {
      current: {
        getBoundingClientRect: () => ({ height: 320, width: 480 }),
      },
    } as never;

    const snapshot = buildGraphDebugSnapshot({
      containerRef,
      graph: {
        graph2ScreenCoords: (x, y) => ({ x: x + 10, y: y + 20 }),
        zoom: () => 1.5,
        zoomToFit: vi.fn(),
      },
      graphMode: '2d',
      nodes: [{ id: 'a.ts', size: 12, x: 5, y: 6 }],
    });

    expect(snapshot).toEqual({
      containerHeight: 320,
      containerWidth: 480,
      graphMode: '2d',
      nodes: [{
        id: 'a.ts',
        screenX: 15,
        screenY: 26,
        size: 12,
        x: 5,
        y: 6,
      }],
      zoom: 1.5,
    });
  });

  it('installs and cleans up the graph debug api when enabled', () => {
    const fitView = vi.fn();
    const zoomToFit = vi.fn();
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    const cleanup = installGraphDebugApi({
      containerRef: { current: null },
      fitView,
      fg2dRef: {
        current: {
          graph2ScreenCoords: (x, y) => ({ x, y }),
          zoom: () => 2,
          zoomToFit,
        },
      },
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [{ id: 'a.ts', size: 4, x: 1, y: 2 }] } },
      graphMode: '2d',
      win,
    });

    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitView();
    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(24);

    expect(fitView).toHaveBeenCalledOnce();
    expect(zoomToFit).toHaveBeenCalledWith(300, 24);

    cleanup?.();
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeUndefined();
  });

  it('installs the graph debug api through the hook when a window is provided', () => {
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    const { unmount } = renderHook(() =>
      useGraphDebugApi({
        containerRef: { current: null },
        fitView: vi.fn(),
        fg2dRef: { current: undefined },
        fg3dRef: { current: undefined },
        graphDataRef: { current: { nodes: [] } },
        graphMode: '2d',
        win,
      }),
    );

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeDefined();
    unmount();
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeUndefined();
  });
});
