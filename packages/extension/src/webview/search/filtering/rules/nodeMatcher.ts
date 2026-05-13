import { globMatch } from '../../../globMatch';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';

export function ruleTargetsNodes(rule: IGroup): boolean {
  return rule.target !== 'edge';
}

function globMatchCaseInsensitive(value: string, pattern: string): boolean {
  return globMatch(value.toLowerCase(), pattern.toLowerCase());
}

function rulePatternMatchesNode(
  node: IGraphData['nodes'][number],
  rule: IGroup,
): boolean {
  if (globMatch(node.id, rule.pattern)) {
    return true;
  }

  if (rule.isPluginDefault) {
    return false;
  }

  const symbol = node.symbol;
  const candidates = [
    node.label,
    symbol?.name,
    symbol?.kind,
    symbol?.pluginKind,
    symbol?.filePath,
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.some((candidate) => globMatchCaseInsensitive(candidate, rule.pattern));
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
  const symbolKindsMatch = !rule.matchSymbolKinds
    || Boolean(symbol?.kind && rule.matchSymbolKinds.includes(symbol.kind));
  const symbolPathMatches = !rule.matchSymbolFilePath
    || Boolean(symbol?.filePath && globMatch(symbol.filePath, rule.matchSymbolFilePath));

  return exactFieldsMatch && symbolKindsMatch && symbolPathMatches && rulePatternMatchesNode(node, rule);
}
