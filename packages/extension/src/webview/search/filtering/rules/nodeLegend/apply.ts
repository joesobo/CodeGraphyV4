import { DEFAULT_NODE_COLOR } from '../../../../../shared/fileColors';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import { normalizeNodeLegendRules } from './compile';
import type {
  CompiledNodeLegendRule,
  NodeLegendRuleInput,
} from './contracts';
import {
  compiledRuleMatchesNode,
  getCaseInsensitiveNodeCandidates,
} from './match';

export function applyCompiledNodeLegendRules(
  node: IGraphData['nodes'][number],
  activeRules: readonly CompiledNodeLegendRule[],
): IGraphData['nodes'][number] {
  const nextNode = {
    ...node,
    color: node.color || DEFAULT_NODE_COLOR,
  };
  let candidates: readonly string[] | undefined;
  const getCandidates = (): readonly string[] => {
    candidates ??= getCaseInsensitiveNodeCandidates(node);
    return candidates;
  };

  for (const compiledRule of activeRules) {
    if (!compiledRuleMatchesNode(node, getCandidates, compiledRule)) {
      continue;
    }

    applyCompiledNodeLegendRule(nextNode, compiledRule);
  }

  return nextNode;
}

export function applyNodeLegendRules(
  node: IGraphData['nodes'][number],
  activeRules: readonly NodeLegendRuleInput[],
): IGraphData['nodes'][number] {
  return applyCompiledNodeLegendRules(node, normalizeNodeLegendRules(activeRules));
}

function applyCompiledNodeLegendRule(
  node: IGraphData['nodes'][number],
  compiledRule: CompiledNodeLegendRule,
): void {
  const { rule } = compiledRule;
  node.color = rule.color;
  if (rule.shape2D) {
    node.shape2D = rule.shape2D;
  }
  if (rule.imageUrl) {
    node.imageUrl = rule.imageUrl;
  }
}
