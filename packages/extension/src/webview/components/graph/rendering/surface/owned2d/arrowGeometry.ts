import type { OwnedGraphNodeStyle } from './contracts';

export const OWNED_ARROW_LENGTH = 12;
export const OWNED_ARROW_HALF_WIDTH = OWNED_ARROW_LENGTH / 1.6 / 2;

interface GraphPoint {
  x: number;
  y: number;
}

export interface OwnedArrowEndpointInsets {
  source: number;
  target: number;
}

function ellipseBoundary(
  halfWidth: number,
  halfHeight: number,
  directionX: number,
  directionY: number,
): number {
  return 1 / Math.hypot(directionX / halfWidth, directionY / halfHeight);
}

function rectangleBoundary(
  halfWidth: number,
  halfHeight: number,
  cornerRadius: number,
  directionX: number,
  directionY: number,
): number {
  const absoluteX = Math.abs(directionX);
  const absoluteY = Math.abs(directionY);
  const radius = Math.min(Math.max(0, cornerRadius), halfWidth, halfHeight);
  const vertical = absoluteX === 0 ? Number.POSITIVE_INFINITY : halfWidth / absoluteX;
  if (vertical * absoluteY <= halfHeight - radius) return vertical;
  const horizontal = absoluteY === 0 ? Number.POSITIVE_INFINITY : halfHeight / absoluteY;
  if (horizontal * absoluteX <= halfWidth - radius) return horizontal;
  const cornerX = halfWidth - radius;
  const cornerY = halfHeight - radius;
  const projection = absoluteX * cornerX + absoluteY * cornerY;
  const discriminant = projection * projection
    - cornerX * cornerX
    - cornerY * cornerY
    + radius * radius;
  return projection + Math.sqrt(Math.max(0, discriminant));
}

function starBoundary(
  halfWidth: number,
  halfHeight: number,
  directionX: number,
  directionY: number,
): number {
  const localX = directionX / halfWidth;
  const localY = directionY / halfHeight;
  const angle = Math.atan2(localY, localX);
  const spike = 0.5 + 0.5 * Math.cos(angle * 5);
  const radius = 0.48 + 0.52 * spike * spike;
  return radius / Math.hypot(localX, localY);
}

function nodeBoundaryDistance(
  style: OwnedGraphNodeStyle,
  directionX: number,
  directionY: number,
): number {
  const halfWidth = Math.max(0.5, style.width / 2);
  const halfHeight = Math.max(0.5, style.height / 2);
  const localX = directionX / halfWidth;
  const localY = directionY / halfHeight;
  switch (style.shape) {
    case 'circle':
      return ellipseBoundary(halfWidth, halfHeight, directionX, directionY);
    case 'rectangle':
    case 'square':
      return rectangleBoundary(
        halfWidth,
        halfHeight,
        style.cornerRadius,
        directionX,
        directionY,
      );
    case 'diamond':
      return 1 / (Math.abs(localX) + Math.abs(localY));
    case 'triangle':
      return 0.5 / Math.max(Math.abs(localX) * 0.866025 - localY * 0.5, localY);
    case 'hexagon':
      return 1 / Math.max(
        Math.abs(localX) * 0.866025 + Math.abs(localY) * 0.5,
        Math.abs(localY),
      );
    case 'star':
      return starBoundary(halfWidth, halfHeight, directionX, directionY);
  }
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
  if (deltaX === 0 && deltaY === 0) {
    return {
      source: nodeBoundaryDistance(sourceStyle, 0, -1),
      target: nodeBoundaryDistance(targetStyle, -1, 0),
    };
  }
  const controlX = (source.x + target.x) / 2 - deltaY * curvature;
  const controlY = (source.y + target.y) / 2 + deltaX * curvature;
  const sourceDirection = unitVector(controlX - source.x, controlY - source.y);
  const targetDirection = unitVector(target.x - controlX, target.y - controlY);
  return {
    source: sourceDirection
      ? nodeBoundaryDistance(sourceStyle, sourceDirection.x, sourceDirection.y)
      : 0,
    target: targetDirection
      ? nodeBoundaryDistance(targetStyle, -targetDirection.x, -targetDirection.y)
      : 0,
  };
}
