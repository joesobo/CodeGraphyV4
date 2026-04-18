import { describe, expect, it, vi } from 'vitest';
import { installGraphDebugApi } from '../../../../src/webview/components/graph/debug/install';

describe('webview/graph/debug/install', () => {
  it('returns undefined when graph debug mode is disabled', () => {
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: false } as Window;

    expect(
      installGraphDebugApi({
        containerRef: { current: null },
        fitView: vi.fn(),
        fg2dRef: { current: undefined },
        fg3dRef: { current: undefined },
        graphDataRef: { current: { nodes: [] } },
        graphMode: '2d',
        win,
      }),
    ).toBeUndefined();

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeUndefined();
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

  it('uses the 3d graph ref for padding fit and snapshot generation', () => {
    const fitView = vi.fn();
    const graph2ScreenCoords = vi.fn((x: number, y: number, z: number) => ({
      x: x + z,
      y: y + z,
    }));
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    installGraphDebugApi({
      containerRef: {
        current: {
          getBoundingClientRect: () => ({ height: 100, width: 200 }),
        } as HTMLElement,
      },
      fitView,
      fg2dRef: { current: undefined },
      fg3dRef: {
        current: {
          graph2ScreenCoords,
        },
      },
      graphDataRef: { current: { nodes: [{ id: 'mesh', size: 6, x: 1, y: 2, z: 3 }] } },
      graphMode: '3d',
      win,
    });

    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(24);
    const snapshot = win.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot();

    expect(fitView).not.toHaveBeenCalled();
    expect(snapshot).toEqual({
      containerHeight: 100,
      containerWidth: 200,
      graphMode: '3d',
      nodes: [{
        id: 'mesh',
        screenX: 4,
        screenY: 5,
        size: 6,
        x: 1,
        y: 2,
      }],
      zoom: null,
    });
    expect(graph2ScreenCoords).toHaveBeenCalledWith(1, 2, 3);
  });

  it('uses the 2d graph ref for padding fit and snapshot generation', () => {
    const zoomToFit2d = vi.fn();
    const zoomToFit3d = vi.fn();
    const graph2ScreenCoords2d = vi.fn((x: number, y: number) => ({
      x: x + 1,
      y: y + 1,
    }));
    const graph2ScreenCoords3d = vi.fn((x: number, y: number, z: number) => ({
      x: x + z,
      y: y + z,
    }));
    const zoom2d = vi.fn(() => 3);
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    installGraphDebugApi({
      containerRef: {
        current: {
          getBoundingClientRect: () => ({ height: 40, width: 80 }),
        } as HTMLElement,
      },
      fitView: vi.fn(),
      fg2dRef: {
        current: {
          graph2ScreenCoords: graph2ScreenCoords2d,
          zoom: zoom2d,
          zoomToFit: zoomToFit2d,
        },
      },
      fg3dRef: {
        current: {
          graph2ScreenCoords: graph2ScreenCoords3d,
          zoomToFit: zoomToFit3d,
        },
      },
      graphDataRef: { current: { nodes: [{ id: 'flat', size: 5, x: 2, y: 3, z: 9 }] } },
      graphMode: '2d',
      win,
    });

    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(18);
    const snapshot = win.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot();

    expect(zoomToFit2d).toHaveBeenCalledWith(300, 18);
    expect(zoomToFit3d).not.toHaveBeenCalled();
    expect(graph2ScreenCoords2d).toHaveBeenCalledWith(2, 3, 9);
    expect(graph2ScreenCoords3d).not.toHaveBeenCalled();
    expect(snapshot).toEqual({
      containerHeight: 40,
      containerWidth: 80,
      graphMode: '2d',
      nodes: [{
        id: 'flat',
        screenX: 3,
        screenY: 4,
        size: 5,
        x: 2,
        y: 3,
      }],
      zoom: 3,
    });
  });

  it('tolerates graph refs without zoomToFit methods', () => {
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    installGraphDebugApi({
      containerRef: { current: null },
      fitView: vi.fn(),
      fg2dRef: {
        current: {},
      },
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [] } },
      graphMode: '2d',
      win,
    });

    expect(() => win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(12)).not.toThrow();
  });
});
