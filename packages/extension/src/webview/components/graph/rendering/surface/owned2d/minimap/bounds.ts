export interface MinimapBounds {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}

export function finiteMinimapBounds(
  nodeX: ArrayLike<number>,
  nodeY: ArrayLike<number>,
): MinimapBounds | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < nodeX.length; index += 1) {
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
