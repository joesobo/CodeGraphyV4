import type { GraphContextMenuEdge } from '../contracts';
import type { GraphContextMenuDecision } from '../decision/model';
import { getNodeTargets, getSingleNodeTarget } from './decisionTargets';
import { findEdge } from './edgeLookup';
import { edgeMatches } from './edgeMatching';
import type { GraphViewContextMenuTargetSelector } from './model';
import { nodeMatches } from './nodeMatching';

export function selectorMatches(
  selector: GraphViewContextMenuTargetSelector,
  decision: GraphContextMenuDecision,
  edges: readonly GraphContextMenuEdge[] | undefined,
): boolean {
  if (selector.kind === 'background') {
    return decision.kind === 'background';
  }

  if (selector.kind === 'node' || selector.kind === 'runtimeNodeType') {
    const target = getSingleNodeTarget(decision);
    return !!target && nodeMatches(target, selector);
  }

  if (selector.kind === 'multiSelection') {
    const targets = getNodeTargets(decision);
    return targets.length > 1 && targets.every(target => nodeMatches(target, selector));
  }

  return decision.kind === 'edge' &&
    edgeMatches(findEdge(decision.edgeId, edges), selector);
}
