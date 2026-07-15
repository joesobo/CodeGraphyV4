import {
  firstInCell,
  nextInCell,
  nodeCellX,
  nodeCellY,
} from '../spatialGrid';
import { applyCollisionPair } from './collisionPair';

export function applyNearbyCollisions(index: i32): i32 {
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
        if (other > index && inTargetCell && applyCollisionPair(index, other)) {
          correctionCount += 1;
        }
        other = nextInCell(other);
      }
    }
  }
  return correctionCount;
}
