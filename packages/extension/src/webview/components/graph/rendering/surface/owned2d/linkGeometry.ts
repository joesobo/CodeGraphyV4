import type { FGLink, FGNode } from '../../../model/build';

export interface OwnedLinkGeometry {
  controlX: number;
  controlY: number;
  source: FGNode;
  target: FGNode;
}

export interface OwnedLinkPoint {
  angle: number;
  x: number;
  y: number;
}

export function ownedLinkGeometry(link: FGLink): OwnedLinkGeometry | undefined {
  if (typeof link.source === 'string' || typeof link.target === 'string') return undefined;
  const source = link.source;
  const target = link.target;
  if (![source.x, source.y, target.x, target.y].every(Number.isFinite)) return undefined;
  const dx = (target.x as number) - (source.x as number);
  const dy = (target.y as number) - (source.y as number);
  const distance = Math.hypot(dx, dy);
  const offset = distance * (link.curvature ?? 0);
  return {
    source,
    target,
    controlX: ((source.x as number) + (target.x as number)) / 2
      + (distance === 0 ? 0 : (-dy / distance) * offset),
    controlY: ((source.y as number) + (target.y as number)) / 2
      + (distance === 0 ? 0 : (dx / distance) * offset),
  };
}

export function pointOnOwnedLink(
  geometry: OwnedLinkGeometry,
  position: number,
): OwnedLinkPoint {
  const inverse = 1 - position;
  const sourceX = geometry.source.x as number;
  const sourceY = geometry.source.y as number;
  const targetX = geometry.target.x as number;
  const targetY = geometry.target.y as number;
  const x = inverse * inverse * sourceX
    + 2 * inverse * position * geometry.controlX
    + position * position * targetX;
  const y = inverse * inverse * sourceY
    + 2 * inverse * position * geometry.controlY
    + position * position * targetY;
  const tangentX = 2 * inverse * (geometry.controlX - sourceX)
    + 2 * position * (targetX - geometry.controlX);
  const tangentY = 2 * inverse * (geometry.controlY - sourceY)
    + 2 * position * (targetY - geometry.controlY);
  return { x, y, angle: Math.atan2(tangentY, tangentX) };
}

export function traceOwnedLink(
  context: CanvasRenderingContext2D,
  geometry: OwnedLinkGeometry,
): void {
  context.beginPath();
  context.moveTo(geometry.source.x as number, geometry.source.y as number);
  context.quadraticCurveTo(
    geometry.controlX,
    geometry.controlY,
    geometry.target.x as number,
    geometry.target.y as number,
  );
}
