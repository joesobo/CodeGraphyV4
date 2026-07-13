import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import { isNodeHidden, isNodePinned } from './velocity';

export function applyCenterForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
): void {
  for (let index = 0; index < state.x.length; index += 1) {
    if (isNodePinned(state, index) || isNodeHidden(state, index)) continue;
    state.vx[index] += -state.x[index] * config.centralGravity * alpha;
    state.vy[index] += -state.y[index] * config.centralGravity * alpha;
  }
}
