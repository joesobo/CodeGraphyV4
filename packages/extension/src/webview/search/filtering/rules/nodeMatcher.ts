import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { ruleConstraintsMatchNode } from './nodeConstraints';
import { rulePatternMatchesNode } from './nodePattern';

export function ruleTargetsNodes(rule: IGroup): boolean {
  return rule.target !== 'edge';
}

export function ruleMatchesNode(
  node: IGraphData['nodes'][number],
  rule: IGroup,
): boolean {
  return ruleConstraintsMatchNode(node, rule) && rulePatternMatchesNode(node, rule);
}
