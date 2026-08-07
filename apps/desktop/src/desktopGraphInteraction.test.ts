import { describe, expect, it } from 'vitest';
import {
  passedDesktopGraphDragThreshold,
  pickDesktopGraphNode,
  screenToDesktopGraph,
  zoomDesktopGraphBy,
  zoomDesktopGraphAtPointer,
} from './desktopGraphInteraction';

describe('desktop graph interaction adapter', () => {
  it('picks the nearest visible Node with zoom-compensated pointer padding', () => {
    const nodeX = new Float32Array([0, 8, 100]);
    const nodeY = new Float32Array([0, 0, 100]);

    expect(pickDesktopGraphNode(nodeX, nodeY, [8, 8, 8], { x: 7, y: 0 }, 1)).toBe(1);
    expect(pickDesktopGraphNode(nodeX, nodeY, [8, 8, 8], { x: 14, y: 0 }, 0.25)).toBe(1);
    expect(pickDesktopGraphNode(nodeX, nodeY, [8, 8, 8], { x: 50, y: 50 }, 1)).toBeUndefined();
  });

  it('keeps the world point under the cursor fixed while zooming', () => {
    const camera = { centerX: 30, centerY: -20, zoom: 1 };
    const before = screenToDesktopGraph(camera, 800, 600, 680, 220);
    const zoomed = zoomDesktopGraphAtPointer(camera, 800, 600, 680, 220, -160);

    expect(screenToDesktopGraph(zoomed, 800, 600, 680, 220)).toEqual(before);
    expect(zoomed.zoom).toBeGreaterThan(camera.zoom);
  });

  it('zooms controls around the current center and clamps the viewport range', () => {
    const camera = { centerX: 20, centerY: -10, zoom: 1 };

    expect(zoomDesktopGraphBy(camera, 1.2)).toEqual({ centerX: 20, centerY: -10, zoom: 1.2 });
    expect(zoomDesktopGraphBy(camera, 100)).toEqual({ centerX: 20, centerY: -10, zoom: 5 });
    expect(zoomDesktopGraphBy(camera, 0.001)).toEqual({ centerX: 20, centerY: -10, zoom: 0.05 });
  });

  it('uses the extension three-pixel cumulative drag threshold', () => {
    expect(passedDesktopGraphDragThreshold(10, 10, 13, 10)).toBe(false);
    expect(passedDesktopGraphDragThreshold(10, 10, 13.1, 10)).toBe(true);
    expect(passedDesktopGraphDragThreshold(10, 10, 12.2, 12.2)).toBe(true);
  });
});
