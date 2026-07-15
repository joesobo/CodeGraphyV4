import type { GraphLinkGeometry } from './geometry';

function quadraticCoordinate(
  source: number,
  target: number,
  control: number,
  position: number,
): number {
  const inverse = 1 - position;
  return inverse * inverse * source
    + 2 * inverse * position * control
    + position * position * target;
}

function cubicCoordinate(
  source: number,
  target: number,
  firstControl: number,
  secondControl: number,
  position: number,
): number {
  const inverse = 1 - position;
  return inverse ** 3 * source
    + 3 * inverse * inverse * position * firstControl
    + 3 * inverse * position * position * secondControl
    + position ** 3 * target;
}

export function pointOnGraphLink(
  geometry: GraphLinkGeometry,
  position: number,
): { x: number; y: number } {
  const sourceX = geometry.source.x as number;
  const sourceY = geometry.source.y as number;
  const targetX = geometry.target.x as number;
  const targetY = geometry.target.y as number;
  if (geometry.secondControlX !== undefined && geometry.secondControlY !== undefined) {
    return {
      x: cubicCoordinate(
        sourceX,
        targetX,
        geometry.controlX,
        geometry.secondControlX,
        position,
      ),
      y: cubicCoordinate(
        sourceY,
        targetY,
        geometry.controlY,
        geometry.secondControlY,
        position,
      ),
    };
  }
  return {
    x: quadraticCoordinate(sourceX, targetX, geometry.controlX, position),
    y: quadraticCoordinate(sourceY, targetY, geometry.controlY, position),
  };
}
