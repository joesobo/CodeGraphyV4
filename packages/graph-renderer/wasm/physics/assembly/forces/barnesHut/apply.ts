import { isHidden, isPinned, nodeCount } from '../../memory';
import { applyForceToTarget } from './targetTraversal';
import { EMPTY_INDEX, root } from './treeState';

export function applyBarnesHutForces(
  alpha: f64,
  theta: f64,
  distanceMinimum: f64,
  distanceMaximum: f64,
): void {
  if (root() == EMPTY_INDEX) return;
  const thetaSquared = theta * theta;
  const distanceMinimumSquared = distanceMinimum * distanceMinimum;
  const distanceMaximumSquared = distanceMaximum * distanceMaximum;
  for (let target = 0; target < nodeCount; target += 1) {
    if (isHidden(target) || isPinned(target)) continue;
    applyForceToTarget(
      target,
      alpha,
      thetaSquared,
      distanceMinimumSquared,
      distanceMaximumSquared,
    );
  }
}
