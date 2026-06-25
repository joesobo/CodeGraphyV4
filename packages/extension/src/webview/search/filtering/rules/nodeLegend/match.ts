import type {
  CompiledNodeLegendRule,
  GraphNode,
} from './contracts';
import { compiledRuleConstraintsMatchNode } from './constraints';

export function compiledRuleMatchesNode(
  node: GraphNode,
  getCandidates: () => readonly string[],
  compiledRule: CompiledNodeLegendRule,
): boolean {
  return compiledRuleConstraintsMatchNode(node, compiledRule)
    && compiledRulePatternMatchesNode(node, getCandidates, compiledRule);
}

export function getCaseInsensitiveNodeCandidates(node: GraphNode): string[] {
  const symbol = node.symbol;
  return [
    node.label,
    symbol?.name,
    symbol?.kind,
    symbol?.pluginKind,
    symbol?.filePath,
  ]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => candidate.toLowerCase());
}

function compiledRulePatternMatchesNode(
  node: GraphNode,
  getCandidates: () => readonly string[],
  compiledRule: CompiledNodeLegendRule,
): boolean {
  if (compiledRule.patternMatches(node.id)) {
    return true;
  }

  if (compiledRule.rule.isPluginDefault) {
    return false;
  }

  if (compiledRule.patternHasPathSeparator) {
    const symbol = node.symbol;
    return pathCandidateMatchesNodeRule(node.label, compiledRule)
      || pathCandidateMatchesNodeRule(symbol?.name, compiledRule)
      || pathCandidateMatchesNodeRule(symbol?.kind, compiledRule)
      || pathCandidateMatchesNodeRule(symbol?.pluginKind, compiledRule)
      || pathCandidateMatchesNodeRule(symbol?.filePath, compiledRule);
  }

  return getCandidates().some((candidate) => compiledRule.caseInsensitivePatternMatches(candidate));
}

function pathCandidateMatchesNodeRule(
  value: string | undefined,
  compiledRule: CompiledNodeLegendRule,
): boolean {
  return Boolean(
    value
    && value.includes('/')
    && compiledRule.caseInsensitivePatternMatches(value.toLowerCase()),
  );
}
