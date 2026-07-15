import {
  chargeDistanceMaximum,
  chargeDistanceMinimum,
  chargeStrength,
  chargeTheta,
} from '../config';
import {
  applyBarnesHut,
  getBarnesHutVisibleNodeCount,
  rebuildBarnesHut,
} from './barnesHut';

const EXACT_REPULSION_NODE_LIMIT: f64 = 500;

export function repulsionEnabled(alpha: f64): bool {
  return alpha != 0 && chargeStrength != 0 && chargeDistanceMaximum != 0;
}

export function rebuildRepulsion(): bool {
  return rebuildBarnesHut(chargeStrength);
}

export function applyRepulsion(alpha: f64): void {
  const approximationProgress = (
    <f64>getBarnesHutVisibleNodeCount() - EXACT_REPULSION_NODE_LIMIT
  ) / EXACT_REPULSION_NODE_LIMIT;
  const theta = chargeTheta * Math.min(1, Math.max(0, approximationProgress));
  applyBarnesHut(
    alpha,
    theta,
    chargeDistanceMinimum,
    chargeDistanceMaximum,
  );
}
