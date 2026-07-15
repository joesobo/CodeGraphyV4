import type { GraphEngineState } from '../engine/state';

export function setSimulationAlphaTarget(state: GraphEngineState, alpha: number): void {
  if (!Number.isFinite(alpha) || alpha < 0) {
    throw new Error('Graph layout alpha target must be a non-negative finite number');
  }
  state.alphaTarget = alpha;
  if (alpha > 0) {
    state.settled = false;
    state.settledStepCount = 0;
  }
}

export function reheatSimulation(state: GraphEngineState, alpha = 1): void {
  if (!Number.isFinite(alpha) || alpha <= 0) {
    throw new Error('Graph layout reheat alpha must be positive');
  }
  state.alpha = Math.max(state.alpha, alpha);
  state.settled = false;
  state.settledStepCount = 0;
}
