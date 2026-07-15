import {
  collisionPadding,
  collisionScale,
  collisionStrength,
} from '../config';
import { deterministicDirectionAngle } from '../initialization';
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
} from '../memory';
import {
  firstInCell,
  nextInCell,
  nodeCellX,
  nodeCellY,
  rebuildSpatialGrid,
} from '../spatialGrid';
import { radius } from '../memory';

export function applyCollisionForces(iterations: f64): i32 {
  let finalCorrectionCount = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let correctionCount = 0;
    rebuildSpatialGrid();
    for (let index = 0; index < nodeCount; index += 1) {
      if (isHidden(index)) continue;
      correctionCount += applyNearbyCollisions(index);
    }
    finalCorrectionCount = correctionCount;
    if (correctionCount == 0) break;
  }
  return finalCorrectionCount;
}

function applyNearbyCollisions(index: i32): i32 {
  let correctionCount = 0;
  const centerX = nodeCellX(index);
  const centerY = nodeCellY(index);
  for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      const targetX = centerX + xOffset;
      const targetY = centerY + yOffset;
      let other = firstInCell(targetX, targetY);
      while (other >= 0) {
        const inTargetCell = nodeCellX(other) == targetX && nodeCellY(other) == targetY;
        if (
          other > index
          && inTargetCell
          && applyCollisionPair(index, other)
        ) {
          correctionCount += 1;
        }
        other = nextInCell(other);
      }
    }
  }
  return correctionCount;
}

function applyCollisionPair(first: i32, second: i32): bool {
  let dx = x(second) - x(first);
  let dy = y(second) - y(first);
  let distanceSquared = dx * dx + dy * dy;
  if (distanceSquared < 0.0001) {
    const angle = deterministicDirectionAngle(first, second);
    dx = Math.cos(angle) * 0.01;
    dy = Math.sin(angle) * 0.01;
    distanceSquared = dx * dx + dy * dy;
  }
  const distance = Math.sqrt(distanceSquared);
  const minimumDistance = (radius(first) + radius(second)) * collisionScale
    + collisionPadding;
  if (distance + 0.25 >= minimumDistance) return false;
  const correction = (minimumDistance - distance) * collisionStrength;
  const directionX = dx / distance;
  const directionY = dy / distance;
  const firstPinned = isPinned(first);
  const secondPinned = isPinned(second);
  if (firstPinned && secondPinned) return false;
  const firstShare: f64 = firstPinned ? 0 : secondPinned ? 1 : 0.5;
  const secondShare: f64 = secondPinned ? 0 : firstPinned ? 1 : 0.5;
  setX(first, x(first) - directionX * correction * firstShare);
  setY(first, y(first) - directionY * correction * firstShare);
  setX(second, x(second) + directionX * correction * secondShare);
  setY(second, y(second) + directionY * correction * secondShare);

  const relativeVelocityX = vx(second) - vx(first);
  const relativeVelocityY = vy(second) - vy(first);
  const closingVelocity = relativeVelocityX * directionX + relativeVelocityY * directionY;
  if (closingVelocity >= 0) return true;
  if (!firstPinned) {
    setVx(first, vx(first) + directionX * closingVelocity * firstShare);
    setVy(first, vy(first) + directionY * closingVelocity * firstShare);
  }
  if (!secondPinned) {
    setVx(second, vx(second) - directionX * closingVelocity * secondShare);
    setVy(second, vy(second) - directionY * closingVelocity * secondShare);
  }
  return true;
}
