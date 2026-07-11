import { GraphNodeFlag, type GraphLayoutConfig, type GraphLayoutState } from '../contracts';
import { deterministicDirection } from '../initialization';
import type { UniformGrid } from '../spatialGrid';
import { applyVelocityPair, isNodeHidden } from './velocity';

export function applyCollisionForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
  grid: UniformGrid,
): void {
  grid.rebuild(state.x, state.y, state.flags, GraphNodeFlag.Hidden);
  for (let iteration = 0; iteration < config.collisionIterations; iteration += 1) {
    for (let index = 0; index < state.x.length; index += 1) {
      if (isNodeHidden(state, index)) continue;
      grid.forEachNearby(index, config.maximumCollisionNeighbors, otherIndex => {
        if (otherIndex <= index || isNodeHidden(state, otherIndex)) return;
        applyCollisionPair(state, config, alpha, index, otherIndex);
      });
    }
  }
}

function applyCollisionPair(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
  first: number,
  second: number,
): void {
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
  if (distance >= minimumDistance) return;
  const impulse = (minimumDistance - distance)
    * config.collisionStrength
    * Math.max(alpha, 0.2)
    * 0.5;
  applyVelocityPair(
    state,
    first,
    second,
    -(dx / distance) * impulse,
    -(dy / distance) * impulse,
  );
}
