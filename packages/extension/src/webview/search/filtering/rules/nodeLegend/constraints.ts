import type {
  CompiledNodeLegendRule,
  GraphNode,
  GraphNodeSymbol,
} from './contracts';

type NodeLegendConstraintMatcher = (
  node: GraphNode,
  symbol: GraphNodeSymbol,
  compiledRule: CompiledNodeLegendRule,
) => boolean;

const NODE_LEGEND_CONSTRAINT_MATCHERS: readonly NodeLegendConstraintMatcher[] = [
  (node, _symbol, { rule }) => optionalRuleValueMatches(rule.matchNodeType, node.nodeType),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolKind, symbol?.kind),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolPluginKind, symbol?.pluginKind),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolSource, symbol?.source),
  (_node, symbol, { rule }) => optionalRuleValueMatches(rule.matchSymbolLanguage, symbol?.language),
  (_node, symbol, { rule }) => optionalSymbolKindsMatch(rule.matchSymbolKinds, symbol?.kind),
  (_node, symbol, compiledRule) => optionalSymbolFilePathMatches(compiledRule, symbol?.filePath),
];

export function compiledRuleConstraintsMatchNode(
  node: GraphNode,
  compiledRule: CompiledNodeLegendRule,
): boolean {
  return !compiledRule.hasConstraints
    || NODE_LEGEND_CONSTRAINT_MATCHERS.every(matcher =>
      matcher(node, node.symbol, compiledRule),
    );
}

function optionalRuleValueMatches<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || expected === actual;
}

function optionalSymbolKindsMatch(
  expected: readonly string[] | undefined,
  actual: string | undefined,
): boolean {
  return expected === undefined || Boolean(actual && expected.includes(actual));
}

function optionalSymbolFilePathMatches(
  compiledRule: CompiledNodeLegendRule,
  filePath: string | undefined,
): boolean {
  return compiledRule.symbolFilePathMatches === undefined
    || Boolean(filePath && compiledRule.symbolFilePathMatches(filePath));
}
