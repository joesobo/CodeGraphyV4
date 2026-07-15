import { centralGravity } from '../config';
import {
  isHidden,
  isPinned,
  nodeCount,
  setVx,
  setVy,
  vx,
  vy,
  x,
  y,
} from '../memory';

export function applyCenterForces(alpha: f64): void {
  for (let index = 0; index < nodeCount; index += 1) {
    if (isPinned(index) || isHidden(index)) continue;
    setVx(index, vx(index) - x(index) * centralGravity * alpha);
    setVy(index, vy(index) - y(index) * centralGravity * alpha);
  }
}
