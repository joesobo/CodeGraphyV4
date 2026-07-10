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
        graphDataRef: { current: { nodes: [] } },
        win,
      }),
    ).toBeUndefined();

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeUndefined();
  });

  it('installs the graph debug api when acceptance html marks the body', () => {
    const win = {
      document: {
        body: {
          dataset: {
            codegraphyDebug: 'true',
          },
        },
      },
    } as unknown as Window;

    installGraphDebugApi({
      containerRef: { current: null },
      fitView: vi.fn(),
      fg2dRef: { current: undefined },
      graphDataRef: { current: { nodes: [] } },
      win,
    });

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeDefined();
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
      graphDataRef: { current: { nodes: [{ id: 'a.ts', size: 4, x: 1, y: 2 }] } },
      win,
    });

    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitView();
    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(24);
    win.__CODEGRAPHY_GRAPH_DEBUG__?.recordRenderedFrame(10);
    win.__CODEGRAPHY_GRAPH_DEBUG__?.recordRenderedFrame(26.7);

    expect(fitView).toHaveBeenCalledOnce();
    expect(zoomToFit).toHaveBeenCalledWith(300, 24);
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.getRenderedFrameTimes()).toEqual([10, 26.7]);
    win.__CODEGRAPHY_GRAPH_DEBUG__?.clearRenderedFrameTimes();
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.getRenderedFrameTimes()).toEqual([]);

    cleanup?.();
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeUndefined();
  });

  it('returns one node screen position without building a full snapshot', () => {
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    installGraphDebugApi({
      containerRef: { current: null },
      fitView: vi.fn(),
      fg2dRef: {
        current: {
          graph2ScreenCoords: (x, y) => ({ x: x + 10, y: y + 20 }),
        },
      },
      graphDataRef: { current: { nodes: [{ id: 'a.ts', size: 4, x: 1, y: 2 }] } },
      win,
    });

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.getNodeScreenPosition('a.ts')).toEqual({
      x: 11,
      y: 22,
    });
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.getNodeScreenPosition('missing.ts')).toBeNull();
  });

  it('opens a node context menu through the graph debug api', () => {
    const openNodeContextMenu = vi.fn();
    const graph2ScreenCoords = vi.fn((x: number, y: number, z: number) => ({
      x: x + z,
      y: y + z,
    }));
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    installGraphDebugApi({
      containerRef: {
        current: {
          getBoundingClientRect: () => ({ left: 10, top: 20 }),
        } as HTMLElement,
      },
      fitView: vi.fn(),
      fg2dRef: {
        current: {
          graph2ScreenCoords,
        },
      },
      graphDataRef: { current: { nodes: [{ id: 'a.ts', size: 4, x: 1, y: 2, z: 3 }] } },
      openNodeContextMenu,
      win,
    });

    win.__CODEGRAPHY_GRAPH_DEBUG__?.openNodeContextMenu('a.ts');

    expect(openNodeContextMenu).toHaveBeenCalledOnce();
    expect(openNodeContextMenu.mock.calls[0]?.[0]).toBe('a.ts');
    expect(openNodeContextMenu.mock.calls[0]?.[1].clientX).toBe(14);
    expect(openNodeContextMenu.mock.calls[0]?.[1].clientY).toBe(25);
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
    const zoomGraphView = vi.fn(() => 3);
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
          zoom: zoomGraphView,
          zoomToFit: zoomToFit2d,
        },
      },
      graphDataRef: {
        current: {
          nodes: [{
            baseOpacity: 0.8,
            color: '#123456',
            id: 'flat',
            shapeSize2D: {
              height: 20,
              width: 40,
            },
            size: 5,
            x: 2,
            y: 3,
            z: 9,
          }],
        },
      },
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
        baseOpacity: 0.8,
        color: '#123456',
        id: 'flat',
        screenX: 3,
        shapeSize2D: {
          height: 20,
          width: 40,
        },
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
      graphDataRef: { current: { nodes: [] } },
      win,
    });

    expect(() => win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(12)).not.toThrow();
  });
});
