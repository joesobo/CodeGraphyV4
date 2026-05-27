import { globMatch } from '../../../globMatch';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';

export function ruleConstraintsMatchNode(
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
  const symbolKindsMatch = !rule.matchSymbolKinds
    || Boolean(symbol?.kind && rule.matchSymbolKinds.includes(symbol.kind));
  const symbolPathMatches = !rule.matchSymbolFilePath
    || Boolean(symbol?.filePath && globMatch(symbol.filePath, rule.matchSymbolFilePath));

  return exactFieldsMatch && symbolKindsMatch && symbolPathMatches;
}
