import type { GraphView3dBounds } from '../../../../fit/api/controls';
import { isFiniteNumber } from '../coords';

export function isBounds(value: unknown): value is GraphView3dBounds {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<GraphView3dBounds>;
  const { x, y, z } = candidate;
  return (
    Array.isArray(x)
    && Array.isArray(y)
    && Array.isArray(z)
    && x.length === 2
    && y.length === 2
    && z.length === 2
    && [...x, ...y, ...z].every(isFiniteNumber)
  );
}
