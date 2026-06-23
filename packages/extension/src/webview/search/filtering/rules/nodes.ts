import { DEFAULT_NODE_COLOR } from '../../../../shared/fileColors';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { createGlobMatcher } from '../../../globMatch';
import { ruleTargetsNodes } from './nodeMatcher';

type GraphNode = IGraphData['nodes'][number];
type GraphNodeSymbol = GraphNode['symbol'];
type NodeLegendConstraintMatcher = (
  node: GraphNode,
  symbol: GraphNodeSymbol,
  compiledRule: CompiledNodeLegendRule,
) => boolean;

export interface CompiledNodeLegendRule {
  caseInsensitivePatternMatches: (value: string) => boolean;
  hasConstraints: boolean;
  patternMatches: (value: string) => boolean;
  patternHasPathSeparator: boolean;
  rule: IGroup;
  symbolFilePathMatches?: (value: string) => boolean;
}

type NodeLegendRuleInput = IGroup | CompiledNodeLegendRule;

export function getOrderedActiveRules(legends: IGroup[]): IGroup[] {
  return legends
    .filter((group) => !group.disabled)
    .reverse();
}

function hasNodeLegendConstraints(rule: IGroup): boolean {
  return Boolean(
    rule.matchNodeType
    || rule.matchSymbolKind
    || rule.matchSymbolKinds?.length
    || rule.matchSymbolPluginKind
    || rule.matchSymbolSource
    || rule.matchSymbolLanguage
    || rule.matchSymbolFilePath,
  );
}

export function compileNodeLegendRules(activeRules: IGroup[]): CompiledNodeLegendRule[] {
  return activeRules
    .filter(ruleTargetsNodes)
    .map((rule) => ({
      caseInsensitivePatternMatches: createGlobMatcher(rule.pattern.toLowerCase()),
      hasConstraints: hasNodeLegendConstraints(rule),
      patternMatches: createGlobMatcher(rule.pattern),
      patternHasPathSeparator: rule.pattern.includes('/'),
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

function optionalRuleValueMatches<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || expected === actual;
}

function optionalSymbolKindsMatch(expected: readonly string[] | undefined, actual: string | undefined): boolean {
  return expected === undefined || Boolean(actual && expected.includes(actual));
}

function optionalSymbolFilePathMatches(compiledRule: CompiledNodeLegendRule, filePath: string | undefined): boolean {
  return compiledRule.symbolFilePathMatches === undefined
    || Boolean(filePath && compiledRule.symbolFilePathMatches(filePath));
}

const NODE_LEGEND_CONSTRAINT_MATCHERS: readonly NodeLegendConstraintMatcher[] = [
  (node, _symbol, { rule }) => optionalRuleValueMatches(rule.matchNodeType, node.nodeType),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolKind, symbol?.kind),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolPluginKind, symbol?.pluginKind),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolSource, symbol?.source),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolLanguage, symbol?.language),
  (_node, symbol, { rule }) => optionalSymbolKindsMatch(rule.matchSymbolKinds, symbol?.kind),
  (_node, symbol, compiledRule) => optionalSymbolFilePathMatches(compiledRule, symbol?.filePath),
];

function compiledRuleConstraintsMatchNode(
  node: GraphNode,
  compiledRule: CompiledNodeLegendRule,
): boolean {
  return !compiledRule.hasConstraints
    || NODE_LEGEND_CONSTRAINT_MATCHERS.every(matcher =>
      matcher(node, node.symbol, compiledRule),
    );
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

function compiledRulePatternMatchesNode(
  node: IGraphData['nodes'][number],
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

function compiledRuleMatchesNode(
  node: IGraphData['nodes'][number],
  getCandidates: () => readonly string[],
  compiledRule: CompiledNodeLegendRule,
): boolean {
  return compiledRuleConstraintsMatchNode(node, compiledRule)
    && compiledRulePatternMatchesNode(node, getCandidates, compiledRule);
}

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
