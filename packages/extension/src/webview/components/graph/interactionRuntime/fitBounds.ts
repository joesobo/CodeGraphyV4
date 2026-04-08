import type { FGNode } from '../model/build';

export const FIT_VIEW_SCREEN_PADDING_2D = 40;
export const DEPTH_VIEW_ID = 'codegraphy.depth-graph';
export const DEPTH_VIEW_BOTTOM_PADDING_2D = 104;

export interface FitBounds2d {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}

function getNodeRadius(node: FGNode): number {
  const size = node.size ?? Number.NaN;

  if (Number.isFinite(size)) {
    return size;
  }

  return 16;
}

export function get2dFitBounds(nodes: FGNode[]): FitBounds2d | null {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const x = node.x ?? Number.NaN;
    const y = node.y ?? Number.NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    const radius = getNodeRadius(node);
    minX = Math.min(minX, x - radius);
    maxX = Math.max(maxX, x + radius);
    minY = Math.min(minY, y - radius);
    maxY = Math.max(maxY, y + radius);
  }

  if (minX === Number.POSITIVE_INFINITY) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}
