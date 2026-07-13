import type { OwnedGraphNodeStyle } from './contracts';

interface GraphPoint {
  x: number;
  y: number;
}

export interface OwnedArrowEndpointInsets {
  source: number;
  target: number;
}

function nodeBoundaryDistance(
  style: OwnedGraphNodeStyle,
  directionX: number,
  directionY: number,
): number {
  const halfWidth = Math.max(0.5, style.width / 2);
  const halfHeight = Math.max(0.5, style.height / 2);
  const absoluteX = Math.abs(directionX);
  const absoluteY = Math.abs(directionY);
  if (style.shape === 'rectangle' || style.shape === 'square') {
    return Math.min(
      absoluteX === 0 ? Number.POSITIVE_INFINITY : halfWidth / absoluteX,
      absoluteY === 0 ? Number.POSITIVE_INFINITY : halfHeight / absoluteY,
    );
  }
  if (style.shape === 'diamond') {
    return 1 / (absoluteX / halfWidth + absoluteY / halfHeight);
  }
  return 1 / Math.hypot(directionX / halfWidth, directionY / halfHeight);
}

function unitVector(x: number, y: number): GraphPoint | undefined {
  const length = Math.hypot(x, y);
  if (length === 0) return undefined;
  return { x: x / length, y: y / length };
}

export function ownedArrowEndpointInsets(
  source: GraphPoint,
  target: GraphPoint,
  curvature: number,
  sourceStyle: OwnedGraphNodeStyle,
  targetStyle: OwnedGraphNodeStyle,
): OwnedArrowEndpointInsets {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  if (deltaX === 0 && deltaY === 0) return { source: 0, target: 0 };
  const controlX = (source.x + target.x) / 2 - deltaY * curvature;
  const controlY = (source.y + target.y) / 2 + deltaX * curvature;
  const sourceDirection = unitVector(controlX - source.x, controlY - source.y);
  const targetDirection = unitVector(target.x - controlX, target.y - controlY);
  return {
    source: sourceDirection
      ? nodeBoundaryDistance(sourceStyle, sourceDirection.x, sourceDirection.y)
      : 0,
    target: targetDirection
      ? nodeBoundaryDistance(targetStyle, targetDirection.x, targetDirection.y)
      : 0,
  };
}
