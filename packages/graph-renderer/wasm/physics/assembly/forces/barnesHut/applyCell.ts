import { x, y } from '../../memory';
import { applyAggregateForce } from './aggregateForce';
import { charge, chargeX, chargeY } from './charge';
import { internal } from './cells';
import {
  forceDistanceSquared,
  setForceDistanceSquared,
  setForceDx,
  setForceDy,
} from './forceState';
import { applyLeafForce } from './leafForce';
import { traversalSize } from './traversal';

export function applyCellForce(
  target: i32,
  cell: i32,
  stackIndex: i32,
  alpha: f64,
  thetaSquared: f64,
  distanceMinimumSquared: f64,
  distanceMaximumSquared: f64,
): bool {
  const cellCharge = charge(cell);
  if (cellCharge == 0) return false;
  const dx = chargeX(cell) - x(target);
  const dy = chargeY(cell) - y(target);
  setForceDx(dx);
  setForceDy(dy);
  setForceDistanceSquared(dx * dx + dy * dy);
  const cellSize = traversalSize(stackIndex);
  if (cellSize * cellSize / thetaSquared < forceDistanceSquared()) {
    applyAggregateForce(
      target,
      cellCharge,
      alpha,
      distanceMinimumSquared,
      distanceMaximumSquared,
    );
    return false;
  }
  if (internal(cell)) return true;
  if (forceDistanceSquared() >= distanceMaximumSquared) return false;
  applyLeafForce(target, cell, alpha, distanceMinimumSquared);
  return false;
}
