import { globMatch } from '../../../globMatch';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';

export function ruleTargetsNodes(rule: IGroup): boolean {
  return rule.target !== 'edge';
}

export function ruleMatchesNode(
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
