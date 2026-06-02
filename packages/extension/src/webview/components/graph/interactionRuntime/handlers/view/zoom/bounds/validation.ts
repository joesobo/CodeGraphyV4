import type { GraphView3dBounds } from '../../../../fit/api/controls';
import { isFiniteNumber } from '../coords';

function isFinitePair(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every(isFiniteNumber);
}

export function isBounds(value: unknown): value is GraphView3dBounds {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<GraphView3dBounds>;
  return isFinitePair(candidate.x)
    && isFinitePair(candidate.y)
    && isFinitePair(candidate.z);
}
