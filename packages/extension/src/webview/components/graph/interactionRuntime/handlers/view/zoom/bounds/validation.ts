import type { GraphView3dBounds } from '../../../../fit/api/controls';
import { isFinitePair } from '../../../../../runtime/physics/numeric';

export function isBounds(value: unknown): value is GraphView3dBounds {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<GraphView3dBounds>;
  return isFinitePair(candidate.x)
    && isFinitePair(candidate.y)
    && isFinitePair(candidate.z);
}
