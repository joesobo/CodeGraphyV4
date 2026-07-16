import { describe, expect, it } from 'vitest';
import {
  fitMinimapProjection,
  graphPointFromMinimap,
  minimapPointFromGraph,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/projection';

describe('Relationship Graph minimap projection', () => {
  it('fits a wide graph uniformly with centered breathing room', () => {
    expect(fitMinimapProjection(
      { maxX: 210, maxY: 100, minX: 10, minY: 50 },
      160,
      12,
    )).toEqual({
      centerX: 110,
      centerY: 75,
      padding: 12,
      size: 160,
      zoom: 0.68,
    });
  });

  it('uses height as the limiting axis for a tall graph', () => {
    expect(fitMinimapProjection(
      { maxX: 60, maxY: 230, minX: 20, minY: 30 },
      160,
      12,
    )).toEqual({
      centerX: 40,
      centerY: 130,
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
});
