import {
  isHidden,
  nodeCount,
} from '../../memory';
import { rebuildSpatialGrid } from '../../spatial/grid';
import { applyNearbyCollisions } from './neighborhood';

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
