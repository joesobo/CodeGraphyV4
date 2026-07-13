import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import { deterministicDirection } from '../initialization';
import { isNodeHidden, isNodePinned } from './velocity';

export function applyRepulsionForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
): void {
  for (let first = 0; first < state.x.length; first += 1) {
    if (isNodeHidden(state, first)) continue;
    for (let second = first + 1; second < state.x.length; second += 1) {
      if (isNodeHidden(state, second)) continue;
      applyRepulsionPair(state, config, alpha, first, second);
    }
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
  const directionX = dx / distance;
  const directionY = dy / distance;
  const firstMultiplier = state.chargeStrengthMultipliers[first];
  const secondMultiplier = state.chargeStrengthMultipliers[second];
  if (!isNodePinned(state, first)) {
    state.vx[first] -= directionX * repelImpulse * secondMultiplier;
    state.vy[first] -= directionY * repelImpulse * secondMultiplier;
  }
  if (!isNodePinned(state, second)) {
    state.vx[second] += directionX * repelImpulse * firstMultiplier;
    state.vy[second] += directionY * repelImpulse * firstMultiplier;
  }
}
