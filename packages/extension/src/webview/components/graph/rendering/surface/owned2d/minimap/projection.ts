export interface MinimapBounds {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}

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

export function finiteMinimapBounds(
  nodeX: ArrayLike<number>,
  nodeY: ArrayLike<number>,
): MinimapBounds | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const count = Math.min(nodeX.length, nodeY.length);
  for (let index = 0; index < count; index += 1) {
    const x = nodeX[index];
    const y = nodeY[index];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return undefined;
  return { maxX, maxY, minX, minY };
}

export function expandMinimapBounds(
  previous: MinimapBounds | undefined,
  current: MinimapBounds,
): MinimapBounds {
  if (!previous) return current;
  return {
    maxX: Math.max(previous.maxX, current.maxX),
    maxY: Math.max(previous.maxY, current.maxY),
    minX: Math.min(previous.minX, current.minX),
    minY: Math.min(previous.minY, current.minY),
  };
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
    y: projection.size / 2 - (graphPoint.y - projection.centerY) * projection.zoom,
  };
}

export function graphPointFromMinimap(
  projection: MinimapProjection,
  panelPoint: MinimapPoint,
): MinimapPoint {
  return {
    x: projection.centerX + (panelPoint.x - projection.size / 2) / projection.zoom,
    y: projection.centerY - (panelPoint.y - projection.size / 2) / projection.zoom,
  };
}
