import { describe, expect, it } from 'vitest';
import {
  expandMinimapBounds,
  fitMinimapProjection,
  finiteMinimapBounds,
  graphPointFromMinimap,
  minimapPointFromGraph,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/projection';

describe('Relationship Graph minimap projection', () => {
  it('fits a wide graph uniformly with centered breathing room', () => {
    const bounds = finiteMinimapBounds(
      Float32Array.of(-100, 100, Number.NaN),
      Float32Array.of(-25, 25, 3),
    );

    expect(fitMinimapProjection(bounds!, 160, 12)).toEqual({
      centerX: 0,
      centerY: 0,
      padding: 12,
      size: 160,
      zoom: 0.68,
    });
  });

  it('round-trips graph and minimap coordinates', () => {
    const projection = fitMinimapProjection(
      { maxX: 60, maxY: 80, minX: -20, minY: 0 },
      160,
      12,
    );
    const panelPoint = minimapPointFromGraph(projection, { x: 30, y: 20 });

    expect(graphPointFromMinimap(projection, panelPoint)).toEqual({ x: 30, y: 20 });
  });

  it('expands active bounds without contracting them', () => {
    expect(expandMinimapBounds(
      { maxX: 20, maxY: 20, minX: -20, minY: -20 },
      { maxX: 15, maxY: 30, minX: -10, minY: -30 },
    )).toEqual({ maxX: 20, maxY: 30, minX: -20, minY: -30 });
  });
});
