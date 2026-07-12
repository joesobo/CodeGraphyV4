import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  clampOwnedGraphZoom,
  fitOwnedGraphCamera,
  graphToScreen,
  MAXIMUM_OWNED_GRAPH_ZOOM,
  MINIMUM_OWNED_GRAPH_ZOOM,
  screenToGraph,
  type OwnedGraphCamera,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera';

describe('owned graph camera', () => {
  it('supports a wide zoom range and precise coordinate round trips at both extremes', () => {
    expect(clampOwnedGraphZoom(0)).toBe(MINIMUM_OWNED_GRAPH_ZOOM);
    expect(clampOwnedGraphZoom(Number.MAX_VALUE)).toBe(MAXIMUM_OWNED_GRAPH_ZOOM);

    for (const zoom of [MINIMUM_OWNED_GRAPH_ZOOM, 1, MAXIMUM_OWNED_GRAPH_ZOOM]) {
      const camera = { centerX: 1234.5, centerY: -987.25, zoom };
      const screen = graphToScreen(camera, 1920, 1080, 1299.75, -902.125);
      const graph = screenToGraph(camera, 1920, 1080, screen.x, screen.y);
      expect(graph.x).toBeCloseTo(1299.75, 8);
      expect(graph.y).toBeCloseTo(-902.125, 8);
    }
  });

  it('fits the full bounds of rectangular nodes', () => {
    const camera: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };
    const nodes = [
      { x: -100, y: 0, size: 2, shapeSize2D: { width: 200, height: 10 } },
      { x: 100, y: 0, size: 2, shapeSize2D: { width: 200, height: 10 } },
    ] as FGNode[];
    fitOwnedGraphCamera(camera, nodes, 500, 500, 50);

    const left = graphToScreen(camera, 500, 500, -200, 0);
    const right = graphToScreen(camera, 500, 500, 200, 0);
    expect(left.x).toBeGreaterThanOrEqual(50);
    expect(right.x).toBeLessThanOrEqual(450);
  });
});
