import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import { deterministicDirection } from '../initialization';
import { isNodeHidden, isNodePinned } from './velocity';

const MINIMUM_DISTANCE_SQUARED = 1;

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
  if (dx === 0 || dy === 0) {
    const direction = deterministicDirection(first, second);
    if (dx === 0) dx = direction.x * 1e-6;
    if (dy === 0) dy = direction.y * 1e-6;
  }
  let distanceSquared = dx * dx + dy * dy;
  if (distanceSquared < MINIMUM_DISTANCE_SQUARED) {
    distanceSquared = Math.sqrt(MINIMUM_DISTANCE_SQUARED * distanceSquared);
  }
  const firstStrength = config.chargeStrength * state.chargeStrengthMultipliers[first];
  const secondStrength = config.chargeStrength * state.chargeStrengthMultipliers[second];
  if (!isNodePinned(state, first)) {
    const impulse = alpha * secondStrength / distanceSquared;
    state.vx[first] += dx * impulse;
    state.vy[first] += dy * impulse;
  }
  if (!isNodePinned(state, second)) {
    const impulse = alpha * firstStrength / distanceSquared;
    state.vx[second] -= dx * impulse;
    state.vy[second] -= dy * impulse;
  }
}
