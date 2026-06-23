import { DEFAULT_NODE_COLOR } from '../../../../shared/fileColors';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { createGlobMatcher } from '../../../globMatch';
import { ruleTargetsNodes } from './nodeMatcher';

export interface CompiledNodeLegendRule {
  caseInsensitivePatternMatches: (value: string) => boolean;
  patternMatches: (value: string) => boolean;
  rule: IGroup;
  symbolFilePathMatches?: (value: string) => boolean;
}

type NodeLegendRuleInput = IGroup | CompiledNodeLegendRule;

export function getOrderedActiveRules(legends: IGroup[]): IGroup[] {
  return legends
    .filter((group) => !group.disabled)
    .reverse();
}

export function compileNodeLegendRules(activeRules: IGroup[]): CompiledNodeLegendRule[] {
  return activeRules
    .filter(ruleTargetsNodes)
    .map((rule) => ({
      caseInsensitivePatternMatches: createGlobMatcher(rule.pattern.toLowerCase()),
      patternMatches: createGlobMatcher(rule.pattern),
      rule,
      ...(rule.matchSymbolFilePath
        ? { symbolFilePathMatches: createGlobMatcher(rule.matchSymbolFilePath) }
        : {}),
    }));
}

function isCompiledNodeLegendRule(rule: NodeLegendRuleInput): rule is CompiledNodeLegendRule {
  return 'patternMatches' in rule && 'rule' in rule;
}

function normalizeNodeLegendRules(activeRules: readonly NodeLegendRuleInput[]): CompiledNodeLegendRule[] {
  if (activeRules.every(isCompiledNodeLegendRule)) {
    return [...activeRules];
  }

  return compileNodeLegendRules(activeRules.filter((rule): rule is IGroup => !isCompiledNodeLegendRule(rule)));
}

function getCaseInsensitiveNodeCandidates(
  node: IGraphData['nodes'][number],
): string[] {
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

function compiledRuleConstraintsMatchNode(
  node: IGraphData['nodes'][number],
  compiledRule: CompiledNodeLegendRule,
): boolean {
  const { rule } = compiledRule;
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
  const symbolPathMatches = !compiledRule.symbolFilePathMatches
    || Boolean(symbol?.filePath && compiledRule.symbolFilePathMatches(symbol.filePath));

  return exactFieldsMatch && symbolKindsMatch && symbolPathMatches;
}

function compiledRulePatternMatchesNode(
  node: IGraphData['nodes'][number],
  candidates: readonly string[],
  compiledRule: CompiledNodeLegendRule,
): boolean {
  if (compiledRule.patternMatches(node.id)) {
    return true;
  }

  if (compiledRule.rule.isPluginDefault) {
    return false;
  }

  return candidates.some((candidate) => compiledRule.caseInsensitivePatternMatches(candidate));
}

function compiledRuleMatchesNode(
  node: IGraphData['nodes'][number],
  candidates: readonly string[],
  compiledRule: CompiledNodeLegendRule,
): boolean {
  return compiledRuleConstraintsMatchNode(node, compiledRule)
    && compiledRulePatternMatchesNode(node, candidates, compiledRule);
}

export function applyCompiledNodeLegendRules(
  node: IGraphData['nodes'][number],
  activeRules: readonly CompiledNodeLegendRule[],
): IGraphData['nodes'][number] {
  const nextNode = {
    ...node,
    color: node.color || DEFAULT_NODE_COLOR,
  };
  const candidates = getCaseInsensitiveNodeCandidates(node);

  for (const compiledRule of activeRules) {
    if (!compiledRuleMatchesNode(node, candidates, compiledRule)) {
      continue;
    }

    const { rule } = compiledRule;
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

export function applyNodeLegendRules(
  node: IGraphData['nodes'][number],
  activeRules: readonly NodeLegendRuleInput[],
): IGraphData['nodes'][number] {
  return applyCompiledNodeLegendRules(node, normalizeNodeLegendRules(activeRules));
}
