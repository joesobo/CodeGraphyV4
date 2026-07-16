import type { MinimapBounds } from './bounds';

export interface MinimapPoint {
  x: number;
  y: number;
}

export interface MinimapProjection {
  centerX: number;
  centerY: number;
  padding: number;
  size: number;
  zoom: number;
}

export function fitMinimapProjection(
  bounds: MinimapBounds,
  size: number,
  padding: number,
): MinimapProjection {
  const available = Math.max(1, size - padding * 2);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    padding,
    size,
    zoom: Math.min(available / width, available / height),
  };
}

export function minimapPointFromGraph(
  projection: MinimapProjection,
  graphPoint: MinimapPoint,
): MinimapPoint {
  return {
    x: projection.size / 2 + (graphPoint.x - projection.centerX) * projection.zoom,
    y: projection.size / 2 + (graphPoint.y - projection.centerY) * projection.zoom,
  };
}

export function graphPointFromMinimap(
  projection: MinimapProjection,
  panelPoint: MinimapPoint,
): MinimapPoint {
  return {
    x: projection.centerX + (panelPoint.x - projection.size / 2) / projection.zoom,
    y: projection.centerY + (panelPoint.y - projection.size / 2) / projection.zoom,
  };
}
