import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import { deterministicDirection } from '../initialization';
import { isNodeHidden, isNodePinned } from './velocity';

export function applyLinkForces(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
): void {
  for (let edge = 0; edge < state.edgeSources.length; edge += 1) {
    const source = state.edgeSources[edge];
    const target = state.edgeTargets[edge];
    if (isNodeHidden(state, source) || isNodeHidden(state, target)) continue;
    applyLinkForce(state, config, alpha, source, target);
  }
}

function applyLinkForce(
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
  source: number,
  target: number,
): void {
  let dx = state.x[target] + state.vx[target] - state.x[source] - state.vx[source];
  let dy = state.y[target] + state.vy[target] - state.y[source] - state.vy[source];
  if (dx === 0 || dy === 0) {
    const direction = deterministicDirection(source, target);
    if (dx === 0) dx = direction.x * 1e-6;
    if (dy === 0) dy = direction.y * 1e-6;
  }
  const distance = Math.hypot(dx, dy);
  const sourceDegree = state.linkDegrees[source];
  const targetDegree = state.linkDegrees[target];
  const strength = config.linkStrength / Math.min(sourceDegree, targetDegree);
  const impulse = ((distance - config.linkDistance) / distance) * alpha * strength;
  const forceX = dx * impulse;
  const forceY = dy * impulse;
  const targetBias = sourceDegree / (sourceDegree + targetDegree);

  if (!isNodePinned(state, target)) {
    state.vx[target] -= forceX * targetBias;
    state.vy[target] -= forceY * targetBias;
  }
  if (!isNodePinned(state, source)) {
    const sourceBias = 1 - targetBias;
    state.vx[source] += forceX * sourceBias;
    state.vy[source] += forceY * sourceBias;
  }
}
