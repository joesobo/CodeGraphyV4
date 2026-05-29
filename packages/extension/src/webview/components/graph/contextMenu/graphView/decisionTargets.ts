import type { GraphContextMenuDecision } from '../decision/model';
import type { GraphContextNodeTarget } from '../decision/targets';

export function getSingleNodeTarget(decision: GraphContextMenuDecision): GraphContextNodeTarget | undefined {
  return 'target' in decision ? decision.target : undefined;
}

export function getNodeTargets(decision: GraphContextMenuDecision): readonly GraphContextNodeTarget[] {
  if ('target' in decision) {
    return [decision.target];
  }

  return 'targets' in decision && decision.kind !== 'edge'
    ? decision.targets
    : [];
}
