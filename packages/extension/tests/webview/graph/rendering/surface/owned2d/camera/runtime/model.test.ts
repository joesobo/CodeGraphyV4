import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import {
  advanceOwnedGraphCameraTransition,
  cancelOwnedGraphCameraTransition,
  clampOwnedGraphZoom,
  fitOwnedGraphCamera,
  graphToScreen,
  MAXIMUM_OWNED_GRAPH_ZOOM,
  MINIMUM_OWNED_GRAPH_ZOOM,
  readOwnedGraphCameraTargetZoom,
  screenToGraph,
  transitionOwnedGraphCamera,
  type OwnedGraphCamera,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera/runtime/model';

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

  it('reports whether a non-empty graph was fitted and replaces pending motion', () => {
    const camera: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

    expect(fitOwnedGraphCamera(camera, [], 500, 500)).toBe(false);
    transitionOwnedGraphCamera(camera, { zoom: 4 }, 300, 100);
    expect(fitOwnedGraphCamera(camera, [{ x: 10, y: 20 }] as FGNode[], 500, 500)).toBe(true);
    expect(camera.transition).toBeNull();
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

  it('eases camera position and zoom to an exact final pose', () => {
    const camera: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

    transitionOwnedGraphCamera(camera, {
      centerX: 100,
      centerY: 40,
      zoom: 4,
    }, 300, 1_000);
    expect(camera).toMatchObject({ centerX: 0, centerY: 0, zoom: 1 });
    expect(readOwnedGraphCameraTargetZoom(camera)).toBe(4);

    expect(advanceOwnedGraphCameraTransition(camera, 1_150)).toBe(true);
    expect(camera.centerX).toBeCloseTo(87.5, 8);
    expect(camera.centerY).toBeCloseTo(35, 8);
    expect(camera.zoom).toBeCloseTo(4 ** 0.875, 8);

    expect(advanceOwnedGraphCameraTransition(camera, 1_300)).toBe(false);
    expect(camera).toMatchObject({ centerX: 100, centerY: 40, zoom: 4 });
    expect(readOwnedGraphCameraTargetZoom(camera)).toBe(4);
  });

  it('retargets combined camera commands and yields immediately to direct input', () => {
    const camera: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

    transitionOwnedGraphCamera(camera, { centerX: 80, centerY: -20 }, 300, 100);
    transitionOwnedGraphCamera(camera, { zoom: 2 }, 300, 100);
    advanceOwnedGraphCameraTransition(camera, 400);
    expect(camera).toMatchObject({ centerX: 80, centerY: -20, zoom: 2 });

    transitionOwnedGraphCamera(camera, { zoom: 4 }, 300, 500);
    cancelOwnedGraphCameraTransition(camera);
    expect(advanceOwnedGraphCameraTransition(camera, 650)).toBe(false);
    expect(camera.zoom).toBe(2);

    transitionOwnedGraphCamera(camera, { centerX: 5, zoom: 3 }, 0, 700);
    expect(camera).toMatchObject({ centerX: 5, centerY: -20, zoom: 3 });

    transitionOwnedGraphCamera(camera, { centerX: 5, zoom: 3 }, 300, 800);
    expect(camera.transition).toBeNull();
  });

  it('preserves the rendered center when direct zoom interrupts a transition', () => {
    const camera: OwnedGraphCamera = { centerX: 0, centerY: 0, zoom: 1 };

    transitionOwnedGraphCamera(camera, { centerX: 100, zoom: 4 }, 300, 1_000);
    advanceOwnedGraphCameraTransition(camera, 1_150);
    const renderedCenterX = camera.centerX;

    transitionOwnedGraphCamera(camera, { zoom: 2 }, 0, 0);

    expect(camera.centerX).toBe(renderedCenterX);
    expect(camera.zoom).toBe(2);
    expect(camera.transition).toBeNull();
  });
});
