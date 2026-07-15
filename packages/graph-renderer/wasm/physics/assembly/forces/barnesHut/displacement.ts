import {
  forceDistanceSquared,
  forceDx,
  forceDy,
  setForceDistanceSquared,
  setForceDx,
  setForceDy,
} from './forceState';
import { jiggle } from './random';

export function softenDisplacement(distanceMinimumSquared: f64): void {
  if (forceDx() == 0) {
    const dx = jiggle();
    setForceDx(dx);
    setForceDistanceSquared(forceDistanceSquared() + dx * dx);
  }
  if (forceDy() == 0) {
    const dy = jiggle();
    setForceDy(dy);
    setForceDistanceSquared(forceDistanceSquared() + dy * dy);
  }
  if (forceDistanceSquared() < distanceMinimumSquared) {
    setForceDistanceSquared(Math.sqrt(distanceMinimumSquared * forceDistanceSquared()));
  }
}
