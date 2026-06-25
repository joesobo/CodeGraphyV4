import { createGlobMatcher } from '../../../globMatch';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';

function ruleTargetsEdges(rule: IGroup): boolean {
  return (rule.target ?? 'node') !== 'node';
}

export interface CompiledEdgeLegendRule {
  patternMatches: (value: string) => boolean;
  rule: IGroup;
}

type EdgeLegendRuleInput = IGroup | CompiledEdgeLegendRule;

export function compileEdgeLegendRules(activeRules: IGroup[]): CompiledEdgeLegendRule[] {
  return activeRules
    .filter(ruleTargetsEdges)
    .map((rule) => ({
      patternMatches: createGlobMatcher(rule.pattern),
      rule,
    }));
}

function isCompiledEdgeLegendRule(rule: EdgeLegendRuleInput): rule is CompiledEdgeLegendRule {
  return 'patternMatches' in rule && 'rule' in rule;
}

function normalizeEdgeLegendRules(activeRules: readonly EdgeLegendRuleInput[]): CompiledEdgeLegendRule[] {
  if (activeRules.every(isCompiledEdgeLegendRule)) {
    return [...activeRules];
  }

  return compileEdgeLegendRules(activeRules.filter((rule): rule is IGroup => !isCompiledEdgeLegendRule(rule)));
}

function matchesEdgeRule(
  edge: IGraphData['edges'][number],
  fromTo: string,
  fromToKind: string,
  rule: CompiledEdgeLegendRule,
): boolean {
  return (
    rule.patternMatches(edge.id)
    || rule.patternMatches(edge.kind)
    || rule.patternMatches(fromTo)
    || rule.patternMatches(fromToKind)
  );
}

export function applyCompiledEdgeLegendRules(
  edge: IGraphData['edges'][number],
  activeRules: readonly CompiledEdgeLegendRule[],
): IGraphData['edges'][number] {
  const nextEdge = { ...edge };
  const fromTo = `${edge.from}->${edge.to}`;
  const fromToKind = `${fromTo}#${edge.kind}`;

  for (const compiledRule of activeRules) {
    if (!matchesEdgeRule(edge, fromTo, fromToKind, compiledRule)) {
      continue;
    }

    nextEdge.color = compiledRule.rule.color;
  }

  return nextEdge;
}

export function applyEdgeLegendRules(
  edge: IGraphData['edges'][number],
  activeRules: readonly EdgeLegendRuleInput[],
): IGraphData['edges'][number] {
  return applyCompiledEdgeLegendRules(edge, normalizeEdgeLegendRules(activeRules));
}
