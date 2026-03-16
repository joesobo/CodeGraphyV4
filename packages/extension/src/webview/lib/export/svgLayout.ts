import type { SvgBounds, SvgExportNode, SvgPosition } from './svgTypes';

const EMPTY_BOUNDS = {
  minX: -100,
  minY: -100,
  maxX: 100,
  maxY: 100,
};

const EXPORT_PADDING = 50;

export function calculateBounds(nodes: SvgExportNode[]): SvgBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    minX = Math.min(minX, x - node.size);
    minY = Math.min(minY, y - node.size);
    maxX = Math.max(maxX, x + node.size);
    maxY = Math.max(maxY, y + node.size);
  }

  if (!Number.isFinite(minX)) {
    minX = EMPTY_BOUNDS.minX;
    minY = EMPTY_BOUNDS.minY;
    maxX = EMPTY_BOUNDS.maxX;
    maxY = EMPTY_BOUNDS.maxY;
  }

  minX -= EXPORT_PADDING;
  minY -= EXPORT_PADDING;
  maxX += EXPORT_PADDING;
  maxY += EXPORT_PADDING;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function buildPositionMap(nodes: SvgExportNode[]): Map<string, SvgPosition> {
  return new Map(nodes.map(node => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
}
