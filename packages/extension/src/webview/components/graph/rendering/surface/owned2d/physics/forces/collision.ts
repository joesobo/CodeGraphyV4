import { GraphNodeFlag, type GraphLayoutConfig, type GraphLayoutState } from '../contracts';
import { deterministicDirection } from '../initialization';
import type { UniformGrid } from '../spatialGrid';
import { isNodeHidden, isNodePinned } from './velocity';

export function applyCollisionForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  grid: UniformGrid,
  iterations = config.collisionIterations,
): number {
  let finalCorrectionCount = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let correctionCount = 0;
    grid.rebuild(state.x, state.y, state.flags, GraphNodeFlag.Hidden);
    for (let index = 0; index < state.x.length; index += 1) {
      if (isNodeHidden(state, index)) continue;
      grid.forEachNearby(index, config.maximumCollisionNeighbors, otherIndex => {
        if (otherIndex <= index || isNodeHidden(state, otherIndex)) return;
        if (applyCollisionPair(state, config, index, otherIndex)) correctionCount += 1;
      });
    }
    finalCorrectionCount = correctionCount;
    if (correctionCount === 0) break;
  }
  return finalCorrectionCount;
}

function applyCollisionPair(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  first: number,
  second: number,
): boolean {
  let dx = state.x[second] - state.x[first];
  let dy = state.y[second] - state.y[first];
  let distanceSquared = dx * dx + dy * dy;
  if (distanceSquared < 0.0001) {
    const direction = deterministicDirection(first, second);
    dx = direction.x * 0.01;
    dy = direction.y * 0.01;
    distanceSquared = dx * dx + dy * dy;
  }
  const distance = Math.sqrt(distanceSquared);
  const minimumDistance = state.radii[first] + state.radii[second] + config.collisionPadding;
  if (distance + 0.25 >= minimumDistance) return false;
  const correction = (minimumDistance - distance) * config.collisionStrength;
  const directionX = dx / distance;
  const directionY = dy / distance;
  const firstPinned = isNodePinned(state, first);
  const secondPinned = isNodePinned(state, second);
  if (firstPinned && secondPinned) return false;
  const firstShare = firstPinned ? 0 : secondPinned ? 1 : 0.5;
  const secondShare = secondPinned ? 0 : firstPinned ? 1 : 0.5;
  state.x[first] -= directionX * correction * firstShare;
  state.y[first] -= directionY * correction * firstShare;
  state.x[second] += directionX * correction * secondShare;
  state.y[second] += directionY * correction * secondShare;

  // Remove closing velocity so the next integration step does not immediately
  // recreate an overlap that the positional constraint just resolved.
  const relativeVelocityX = state.vx[second] - state.vx[first];
  const relativeVelocityY = state.vy[second] - state.vy[first];
  const closingVelocity = relativeVelocityX * directionX + relativeVelocityY * directionY;
  if (closingVelocity >= 0) return true;
  if (!firstPinned) {
    state.vx[first] += directionX * closingVelocity * firstShare;
    state.vy[first] += directionY * closingVelocity * firstShare;
  }
  if (!secondPinned) {
    state.vx[second] -= directionX * closingVelocity * secondShare;
    state.vy[second] -= directionY * closingVelocity * secondShare;
  }
  return true;
}
