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
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [] } },
      graphMode: '2d',
      win,
    });

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeDefined();
  });

  it('installs stable bounded measurement and deterministic camera controls', () => {
    const fitView = vi.fn();
    const centerAt = vi.fn();
    const zoom = vi.fn(() => 2);
    const zoomToFit = vi.fn();
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    const install = () => installGraphDebugApi({
      containerRef: { current: null },
      fitView,
      fg2dRef: {
        current: {
          centerAt,
          graph2ScreenCoords: (x, y) => ({ x, y }),
          zoom,
          zoomToFit,
        },
      },
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [{ id: 'a.ts', size: 4, x: 1, y: 2 }] } },
      graphMode: '2d' as const,
      win,
    });
    const cleanup = install();

    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitView();
    win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(24);
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.centerNode('a.ts', 1)).toBe(true);
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.centerNode('missing.ts', 1)).toBe(false);
    win.__CODEGRAPHY_GRAPH_DEBUG__?.startRenderedFrameRecording();
    win.__CODEGRAPHY_GRAPH_DEBUG__?.recordRenderedFrame(10);
    cleanup?.();
    install();
    win.__CODEGRAPHY_GRAPH_DEBUG__?.recordRenderedFrame(26.7);

    expect(fitView).toHaveBeenCalledOnce();
    expect(zoomToFit).toHaveBeenCalledWith(300, 24);
    expect(zoom).toHaveBeenCalledWith(1, 0);
    expect(centerAt).toHaveBeenCalledWith(1, 2, 0);
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.stopRenderedFrameRecording()).toEqual([10, 26.7]);

    win.__CODEGRAPHY_GRAPH_DEBUG__?.recordRenderedFrame(40);
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.stopRenderedFrameRecording()).toEqual([10, 26.7]);
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
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [{ id: 'a.ts', size: 4, x: 1, y: 2 }] } },
      graphMode: '2d',
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
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [{ id: 'a.ts', size: 4, x: 1, y: 2, z: 3 }] } },
      graphMode: '2d',
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
      graphDataRef: { current: { nodes: [{ baseOpacity: 0.45, color: '#525c6a', id: 'mesh', size: 6, x: 1, y: 2, z: 3 }] } },
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
        baseOpacity: 0.45,
        collisionRadius: 10,
        color: '#525c6a',
        id: 'mesh',
        positionFinite: true,
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
      fg3dRef: {
        current: {
          graph2ScreenCoords: graph2ScreenCoords3d,
          zoomToFit: zoomToFit3d,
        },
      },
      graphDataRef: {
        current: {
          nodes: [{
            baseOpacity: 0.8,
            collisionRadius2D: 24,
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
        baseOpacity: 0.8,
        collisionRadius: 28,
        color: '#123456',
        id: 'flat',
        positionFinite: true,
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
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [] } },
      graphMode: '2d',
      win,
    });

    expect(() => win.__CODEGRAPHY_GRAPH_DEBUG__?.fitViewWithPadding(12)).not.toThrow();
  });
});
