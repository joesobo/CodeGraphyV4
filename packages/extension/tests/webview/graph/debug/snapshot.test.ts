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

  it('falls back to zero bounds and node coordinates when no container or graph helpers are available', () => {
    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: undefined,
      graphMode: '3d',
      nodes: [{ id: 'b.ts', size: 8, x: 3, y: 4 }],
    });

    expect(snapshot).toEqual({
      containerHeight: 0,
      containerWidth: 0,
      graphMode: '3d',
      nodes: [{
        id: 'b.ts',
        screenX: 3,
        screenY: 4,
        size: 8,
        x: 3,
        y: 4,
      }],
      zoom: null,
    });
  });

  it('passes 3d z coordinates to the screen projection helper', () => {
    const graph2ScreenCoords = vi.fn((x: number, y: number, z: number) => ({
      x: x + z,
      y: y + z,
    }));

    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: {
        graph2ScreenCoords,
      },
      graphMode: '3d',
      nodes: [{ id: 'c.ts', size: 10, x: 1, y: 2, z: 5 }],
    });

    expect(graph2ScreenCoords).toHaveBeenCalledWith(1, 2, 5);
    expect(snapshot.nodes).toEqual([{
      id: 'c.ts',
      screenX: 6,
      screenY: 7,
      size: 10,
      x: 1,
      y: 2,
    }]);
    expect(snapshot.zoom).toBeNull();
  });

  it('uses zero for missing coordinates and z values', () => {
    const graph2ScreenCoords = vi.fn((x: number, y: number, z: number) => ({
      x: x + y + z,
      y: x + y + z,
    }));

    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: {
        graph2ScreenCoords,
      },
      graphMode: '2d',
      nodes: [{ id: 'd.ts', size: 4 }],
    });

    expect(graph2ScreenCoords).toHaveBeenCalledWith(0, 0, 0);
    expect(snapshot.nodes).toEqual([{
      id: 'd.ts',
      screenX: 0,
      screenY: 0,
      size: 4,
      x: 0,
      y: 0,
    }]);
    expect(snapshot.zoom).toBeNull();
  });

  it('keeps 3d snapshots at null zoom even when a zoom reader exists', () => {
    const zoom = vi.fn(() => 9);

    const snapshot = buildGraphDebugSnapshot({
      containerRef: { current: null },
      graph: {
        zoom,
      },
      graphMode: '3d',
      nodes: [],
    });

    expect(zoom).not.toHaveBeenCalled();
    expect(snapshot.zoom).toBeNull();
  });
});
