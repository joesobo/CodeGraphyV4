import { setVx, setVy, vx, vy } from '../../../memory';
import { forceDistanceSquared, forceDx, forceDy } from '../forceState';
import { softenDisplacement } from './displacement';

export function applyAggregateForce(
  target: i32,
  cellCharge: f64,
  alpha: f64,
  distanceMinimumSquared: f64,
  distanceMaximumSquared: f64,
): void {
  if (forceDistanceSquared() >= distanceMaximumSquared) return;
  softenDisplacement(distanceMinimumSquared);
  const impulse = cellCharge * alpha / forceDistanceSquared();
  setVx(target, vx(target) + forceDx() * impulse);
  setVy(target, vy(target) + forceDy() * impulse);
}
