import type { GraphLayoutConfig, GraphLayoutState } from './contracts';
import { recoverFinitePosition } from './initialization';
import { isNodeHidden, isNodePinned } from './forces/velocity';

export function integrateGraphLayout(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
): number {
  let maximumVelocity = 0;

  for (let index = 0; index < state.x.length; index += 1) {
    if (isNodePinned(state, index) || isNodeHidden(state, index)) {
      state.vx[index] = 0;
      state.vy[index] = 0;
      continue;
    }
    const velocityRetention = 1 - config.velocityDecay;
    state.vx[index] *= velocityRetention;
    state.vy[index] *= velocityRetention;
    state.x[index] += state.vx[index];
    state.y[index] += state.vy[index];
    recoverFinitePosition(state, index, config.initializationSpacing);
    maximumVelocity = Math.max(
      maximumVelocity,
      Math.hypot(state.vx[index], state.vy[index]),
    );
  }
  return maximumVelocity;
}
