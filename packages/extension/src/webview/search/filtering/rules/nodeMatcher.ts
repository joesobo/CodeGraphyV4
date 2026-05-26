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

function optionalFieldMatches(expected: string | undefined, actual: string | undefined): boolean {
  return !expected || expected === actual;
}

function optionalSymbolKindsMatch(expected: readonly string[] | undefined, actual: string | undefined): boolean {
  return !expected || (actual !== undefined && expected.includes(actual));
}

function optionalSymbolFilePathMatches(expected: string | undefined, actual: string | undefined): boolean {
  return !expected || (actual !== undefined && globMatch(actual, expected));
}

function ruleScopedFieldsMatch(
  node: IGraphData['nodes'][number],
  rule: IGroup,
): boolean {
  const symbol = node.symbol;
  return optionalFieldMatches(rule.matchNodeType, node.nodeType)
    && optionalFieldMatches(rule.matchSymbolKind, symbol?.kind)
    && optionalFieldMatches(rule.matchSymbolPluginKind, symbol?.pluginKind)
    && optionalFieldMatches(rule.matchSymbolSource, symbol?.source)
    && optionalFieldMatches(rule.matchSymbolLanguage, symbol?.language)
    && optionalSymbolKindsMatch(rule.matchSymbolKinds, symbol?.kind)
    && optionalSymbolFilePathMatches(rule.matchSymbolFilePath, symbol?.filePath);
}

export function ruleMatchesNode(
  node: IGraphData['nodes'][number],
  rule: IGroup,
): boolean {
  return ruleScopedFieldsMatch(node, rule) && rulePatternMatchesNode(node, rule);
}
