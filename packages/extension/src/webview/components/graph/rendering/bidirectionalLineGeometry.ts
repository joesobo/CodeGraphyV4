import type { FGNode } from '../../graphModel';
import {
  DIRECTIONAL_ARROW_LENGTH_2D,
  DIRECTIONAL_ARROW_NODE_GAP_2D,
} from './linkShared';

export interface BidirectionalLineGeometry {
  arrowHalfWidth: number;
  arrowLength: number;
  arrowVertexLength: number;
  endX: number;
  endY: number;
  normalX: number;
  normalY: number;
  startX: number;
  startY: number;
  vectorX: number;
  vectorY: number;
}

export function createBidirectionalLineGeometry(
  source: FGNode,
  target: FGNode,
  globalScale: number,
): BidirectionalLineGeometry | null {
  if (source.x == null || source.y == null || target.x == null || target.y == null) {
    return null;
  }

  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance < 1) return null;

  const vectorX = deltaX / distance;
  const vectorY = deltaY / distance;
  const nodeGap = DIRECTIONAL_ARROW_NODE_GAP_2D / globalScale;
  const startInset = source.size + nodeGap;
  const endInset = target.size + nodeGap;
  if (distance <= startInset + endInset) return null;

  const startX = source.x + vectorX * startInset;
  const startY = source.y + vectorY * startInset;
  const endX = target.x - vectorX * endInset;
  const endY = target.y - vectorY * endInset;
  const arrowLength = DIRECTIONAL_ARROW_LENGTH_2D;

  return {
    arrowHalfWidth: arrowLength / 1.6 / 2,
    arrowLength,
    arrowVertexLength: arrowLength * 0.2,
    endX,
    endY,
    normalX: -vectorY,
    normalY: vectorX,
    startX,
    startY,
    vectorX,
    vectorY,
  };
}
