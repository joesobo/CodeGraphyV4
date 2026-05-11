import { globMatch } from '../../../globMatch';
import { DEFAULT_NODE_COLOR } from '../../../../shared/fileColors';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';

function ruleTargetsNodes(rule: IGroup): boolean {
  return rule.target !== 'edge';
}

function ruleMatchesNode(
  node: IGraphData['nodes'][number],
  rule: IGroup,
): boolean {
  const symbol = node.symbol;
  const exactMatches = [
    [rule.matchNodeType, node.nodeType],
    [rule.matchSymbolKind, symbol?.kind],
    [rule.matchSymbolPluginKind, symbol?.pluginKind],
    [rule.matchSymbolSource, symbol?.source],
    [rule.matchSymbolLanguage, symbol?.language],
  ];
  const exactFieldsMatch = exactMatches.every(([expected, actual]) => !expected || expected === actual);
  const symbolPathMatches = !rule.matchSymbolFilePath
    || Boolean(symbol?.filePath && globMatch(symbol.filePath, rule.matchSymbolFilePath));

  return exactFieldsMatch && symbolPathMatches && globMatch(node.id, rule.pattern);
}

export function getOrderedActiveRules(legends: IGroup[]): IGroup[] {
  return legends
    .filter((group) => !group.disabled)
    .reverse();
}

export function applyNodeLegendRules(
  node: IGraphData['nodes'][number],
  activeRules: IGroup[],
): IGraphData['nodes'][number] {
  const nextNode = {
    ...node,
    color: node.color || DEFAULT_NODE_COLOR,
  };

  for (const rule of activeRules) {
    if (!ruleTargetsNodes(rule) || !ruleMatchesNode(node, rule)) {
      continue;
    }

    nextNode.color = rule.color;
    if (rule.shape2D) {
      nextNode.shape2D = rule.shape2D;
    }
    if (rule.shape3D) {
      nextNode.shape3D = rule.shape3D;
    }
    if (rule.imageUrl) {
      nextNode.imageUrl = rule.imageUrl;
    }
  }

  return nextNode;
}
