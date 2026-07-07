import type { GraphView3dCoords } from '../../../fit/api/controls';
import { isFiniteNumber } from '../../../../runtime/physics/numeric';

export function isCoord(value: unknown): value is GraphView3dCoords {
  const candidate = value as Partial<GraphView3dCoords> | undefined;
  return (
    candidate !== undefined
    && isFiniteNumber(candidate.x ?? Number.NaN)
    && isFiniteNumber(candidate.y ?? Number.NaN)
    && isFiniteNumber(candidate.z ?? Number.NaN)
  );
}

export function toCoord(value: GraphView3dCoords): GraphView3dCoords {
  return { x: value.x, y: value.y, z: value.z };
}
