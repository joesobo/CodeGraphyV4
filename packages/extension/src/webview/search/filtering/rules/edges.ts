import { globMatch } from '../../../globMatch';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';

function ruleTargetsEdges(rule: IGroup): boolean {
  return (rule.target ?? 'node') !== 'node';
}

function matchesEdgeRule(
  edge: IGraphData['edges'][number],
  rule: IGroup,
): boolean {
  return (
    globMatch(edge.id, rule.pattern)
    || globMatch(edge.kind, rule.pattern)
    || globMatch(`${edge.from}->${edge.to}`, rule.pattern)
    || globMatch(`${edge.from}->${edge.to}#${edge.kind}`, rule.pattern)
  );
}

export function applyEdgeLegendRules(
  edge: IGraphData['edges'][number],
  activeRules: IGroup[],
): IGraphData['edges'][number] {
  const nextEdge = { ...edge };

  for (const rule of activeRules) {
    if (!ruleTargetsEdges(rule) || !matchesEdgeRule(edge, rule)) {
      continue;
    }

    nextEdge.color = rule.color;
  }

  return nextEdge;
}
