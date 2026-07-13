import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import type { FlatBarnesHutTree } from './barnesHut';

const EXACT_REPULSION_NODE_LIMIT = 500;

export function resolveRepulsionTheta(
  visibleNodeCount: number,
  maximumTheta: number,
): number {
  const approximationProgress = (
    visibleNodeCount - EXACT_REPULSION_NODE_LIMIT
  ) / EXACT_REPULSION_NODE_LIMIT;
  return maximumTheta * Math.min(1, Math.max(0, approximationProgress));
}

export function applyRepulsionForces(
  tree: FlatBarnesHutTree,
  state: GraphLayoutState,
  config: GraphLayoutConfig,
  alpha: number,
): void {
  if (alpha === 0 || config.chargeStrength === 0 || config.chargeDistanceMax === 0) return;
  tree.rebuild(state, config.chargeStrength);
  // Preserve the exact charge behavior that defines the locked 500-node feel,
  // then transition continuously to D3's Barnes-Hut theta by 1,000 visible nodes.
  const theta = resolveRepulsionTheta(tree.visibleNodeCount, config.chargeTheta);
  tree.apply(
    state,
    alpha,
    theta,
    config.chargeDistanceMin,
    config.chargeDistanceMax,
  );
}
