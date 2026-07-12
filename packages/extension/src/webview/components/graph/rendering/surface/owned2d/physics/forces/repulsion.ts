import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import { deterministicDirection } from '../initialization';
import type { UniformGrid } from '../spatialGrid';
import { applyVelocityPair, isNodeHidden } from './velocity';

export function applyRepulsionForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
  grid: UniformGrid,
): void {
  for (let index = 0; index < state.x.length; index += 1) {
    if (isNodeHidden(state, index)) continue;
    grid.forEachNearby(index, config.maximumNeighbors, otherIndex => {
      if (otherIndex <= index || isNodeHidden(state, otherIndex)) return;
      applyRepulsionPair(state, config, alpha, index, otherIndex);
    });
  }
}

function applyRepulsionPair(
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
  const repelImpulse = Math.min(
    config.maximumSpeed,
    (-config.gravitationalConstant * alpha) / Math.max(distanceSquared, 25),
  );
  applyVelocityPair(
    state,
    first,
    second,
    -(dx / distance) * repelImpulse,
    -(dy / distance) * repelImpulse,
  );
}
