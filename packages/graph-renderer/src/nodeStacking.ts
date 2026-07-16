export interface GraphNodeDrawnDimensions {
  height: number;
  width: number;
}

export function graphNodeDrawnArea(width: number, height: number): number {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  return safeWidth * safeHeight;
}

export function createGraphNodeStackingOrder(
  nodes: readonly GraphNodeDrawnDimensions[],
): Uint32Array {
  const areas = nodes.map(node => graphNodeDrawnArea(node.width, node.height));
  return Uint32Array.from(
    areas.map((_area, index) => index)
      .sort((left, right) => areas[left] - areas[right] || left - right),
  );
}
