import { describe, expect, it, vi } from 'vitest';
import { buildGraphDebugSnapshot } from '../../../../src/webview/components/graph/debug/snapshot';

describe('webview/graph/debug/snapshot', () => {
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
      nodes: [{ id: 'a.ts', imageUrl: 'webview://icon.svg', size: 12, x: 5, y: 6 }],
    });

    expect(snapshot).toEqual({
      containerHeight: 320,
      containerWidth: 480,
      nodes: [{
        collisionRadius: 16,
        id: 'a.ts',
        imageUrl: 'webview://icon.svg',
        positionFinite: true,
        screenX: 15,
        screenY: 26,
        size: 12,
        x: 5,
        y: 6,
      }],
      zoom: 1.5,
    });
  });

  it('falls back to zero bounds and node coordinates when no container or graph helpers are available', () => {
    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: undefined,
      nodes: [{ id: 'b.ts', size: 8, x: 3, y: 4 }],
    });

    expect(snapshot).toEqual({
      containerHeight: 0,
      containerWidth: 0,
      nodes: [{
        collisionRadius: 12,
        id: 'b.ts',
        positionFinite: true,
        screenX: 3,
        screenY: 4,
        size: 8,
        x: 3,
        y: 4,
      }],
      zoom: null,
    });
  });

  it('passes 2d coordinates to the screen projection helper', () => {
    const graph2ScreenCoords = vi.fn((x: number, y: number) => ({
      x: x + 5,
      y: y + 5,
    }));

    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: { graph2ScreenCoords },
      nodes: [{ id: 'c.ts', size: 10, x: 1, y: 2 }],
    });

    expect(graph2ScreenCoords).toHaveBeenCalledWith(1, 2);
    expect(snapshot.nodes).toEqual([{
      collisionRadius: 14,
      id: 'c.ts',
      positionFinite: true,
      screenX: 6,
      screenY: 7,
      size: 10,
      x: 1,
      y: 2,
    }]);
    expect(snapshot.zoom).toBeNull();
  });

  it('uses zero for missing coordinates', () => {
    const graph2ScreenCoords = vi.fn((x: number, y: number) => ({
      x: x + y,
      y: x + y,
    }));

    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: { graph2ScreenCoords },
      nodes: [{ id: 'd.ts', size: 4 }],
    });

    expect(graph2ScreenCoords).toHaveBeenCalledWith(0, 0);
    expect(snapshot.nodes).toEqual([{
      collisionRadius: 8,
      id: 'd.ts',
      positionFinite: false,
      screenX: 0,
      screenY: 0,
      size: 4,
      x: 0,
      y: 0,
    }]);
    expect(snapshot.zoom).toBeNull();
  });

  it('reads the 2d zoom level when available', () => {
    const zoom = vi.fn(() => 9);

    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: { zoom },
      nodes: [],
    });

    expect(zoom).toHaveBeenCalledOnce();
    expect(snapshot.zoom).toBe(9);
  });
});
