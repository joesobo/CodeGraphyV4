import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import { isNodeHidden, isNodePinned } from './velocity';

export function applyRadialForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
): void {
  for (let index = 0; index < state.x.length; index += 1) {
    const targetRadius = state.targetRadius[index];
    if (
      !Number.isFinite(targetRadius)
      || isNodePinned(state, index)
      || isNodeHidden(state, index)
    ) continue;
    const dx = state.x[index] || 1e-6;
    const dy = state.y[index] || 1e-6;
    const radius = Math.hypot(dx, dy);
    const impulse = (targetRadius - radius) * config.radialStrength * alpha / radius;
    state.vx[index] += dx * impulse;
    state.vy[index] += dy * impulse;
  }
}
