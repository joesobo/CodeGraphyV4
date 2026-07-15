import type { GraphEngineState } from './engineState';

export function stepSimulation(state: GraphEngineState): void {
  state.alpha += (state.alphaTarget - state.alpha) * state.config.alphaDecay;
  const iterations = state.alpha < 0.1
    ? Math.max(state.config.collisionIterations, 16)
    : state.config.collisionIterations;
  const maximumVelocity = state.kernel.step(state.alpha, iterations);
  state.graph = state.kernel.state;
  const calm = state.alpha <= state.config.alphaMinimum
    && maximumVelocity <= state.config.settleSpeed
    && state.kernel.collisionCorrectionCount === 0;
  state.settledStepCount = calm ? state.settledStepCount + 1 : 0;
  state.settled = state.settledStepCount >= state.config.settleSteps;
}
