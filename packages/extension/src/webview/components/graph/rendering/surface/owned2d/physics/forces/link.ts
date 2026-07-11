import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import { deterministicDirection } from '../initialization';
import { applyVelocityPair, isNodeHidden } from './velocity';

export function applyLinkForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
): void {
  for (let edge = 0; edge < state.edgeSources.length; edge += 1) {
    const source = state.edgeSources[edge];
    const target = state.edgeTargets[edge];
    if (isNodeHidden(state, source) || isNodeHidden(state, target)) continue;
    let dx = state.x[target] - state.x[source];
    let dy = state.y[target] - state.y[source];
    let distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < 0.0001) {
      const direction = deterministicDirection(source, target);
      dx = direction.x * 0.01;
      dy = direction.y * 0.01;
      distanceSquared = dx * dx + dy * dy;
    }
    const distance = Math.sqrt(distanceSquared);
    const impulse = (distance - config.linkDistance) * config.linkForce * alpha * 0.01;
    applyVelocityPair(
      state,
      source,
      target,
      (dx / distance) * impulse,
      (dy / distance) * impulse,
    );
  }
}
