import type { FGLink, FGNode } from '../../../model/build';

export const OWNED_SELF_LOOP_RADIUS = 70;

export interface OwnedLinkGeometry {
  controlX: number;
  controlY: number;
  secondControlX?: number;
  secondControlY?: number;
  source: FGNode;
  target: FGNode;
}

export function ownedLinkGeometry(link: FGLink): OwnedLinkGeometry | undefined {
  if (typeof link.source === 'string' || typeof link.target === 'string') return undefined;
  const source = link.source;
  const target = link.target;
  if (![source.x, source.y, target.x, target.y].every(Number.isFinite)) return undefined;
  const dx = (target.x as number) - (source.x as number);
  const dy = (target.y as number) - (source.y as number);
  const distance = Math.hypot(dx, dy);
  const curvature = link.curvature ?? 0;
  if (distance === 0) {
    const radius = Math.max(0.5, Math.abs(curvature)) * OWNED_SELF_LOOP_RADIUS;
    return {
      source,
      target,
      controlX: (source.x as number),
      controlY: (source.y as number) - radius,
      secondControlX: (source.x as number) + radius,
      secondControlY: (source.y as number),
    };
  }
  const offset = distance * curvature;
  return {
    source,
    target,
    controlX: ((source.x as number) + (target.x as number)) / 2 + (dy / distance) * offset,
    controlY: ((source.y as number) + (target.y as number)) / 2 - (dx / distance) * offset,
  };
}

export function pointOnOwnedLink(
  geometry: OwnedLinkGeometry,
  position: number,
): { x: number; y: number } {
  const inverse = 1 - position;
  const sourceX = geometry.source.x as number;
  const sourceY = geometry.source.y as number;
  const targetX = geometry.target.x as number;
  const targetY = geometry.target.y as number;
  if (geometry.secondControlX !== undefined && geometry.secondControlY !== undefined) {
    const x = inverse ** 3 * sourceX
      + 3 * inverse * inverse * position * geometry.controlX
      + 3 * inverse * position * position * geometry.secondControlX
      + position ** 3 * targetX;
    const y = inverse ** 3 * sourceY
      + 3 * inverse * inverse * position * geometry.controlY
      + 3 * inverse * position * position * geometry.secondControlY
      + position ** 3 * targetY;
    return { x, y };
  }
  const x = inverse * inverse * sourceX
    + 2 * inverse * position * geometry.controlX
    + position * position * targetX;
  const y = inverse * inverse * sourceY
    + 2 * inverse * position * geometry.controlY
    + position * position * targetY;
  return { x, y };
}
