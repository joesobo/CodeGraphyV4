import { velocityDecay } from './config';
import { recoverFinitePosition } from './initialization';
import {
  isHidden,
  isPinned,
  nodeCount,
  setVx,
  setVy,
  setX,
  setY,
  vx,
  vy,
  x,
  y,
} from './memory';

export function integrateGraphLayout(): f64 {
  let maximumVelocity: f64 = 0;
  const velocityRetention = 1 - velocityDecay;
  for (let index = 0; index < nodeCount; index += 1) {
    if (isPinned(index) || isHidden(index)) {
      setVx(index, 0);
      setVy(index, 0);
      continue;
    }
    setVx(index, vx(index) * velocityRetention);
    setVy(index, vy(index) * velocityRetention);
    setX(index, x(index) + vx(index));
    setY(index, y(index) + vy(index));
    recoverFinitePosition(index);
    const currentVx = vx(index);
    const currentVy = vy(index);
    maximumVelocity = Math.max(
      maximumVelocity,
      Math.sqrt(currentVx * currentVx + currentVy * currentVy),
    );
  }
  return maximumVelocity;
}
