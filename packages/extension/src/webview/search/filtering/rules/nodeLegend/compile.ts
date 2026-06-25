import type { IGroup } from '../../../../../shared/settings/groups';
import { createGlobMatcher } from '../../../../globMatch';
import { ruleTargetsNodes } from '../nodeMatcher';
import type { CompiledNodeLegendRule, NodeLegendRuleInput } from './contracts';

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
      hasConstraints: hasNodeLegendConstraints(rule),
      patternMatches: createGlobMatcher(rule.pattern),
      patternHasPathSeparator: rule.pattern.includes('/'),
      rule,
      ...(rule.matchSymbolFilePath
        ? { symbolFilePathMatches: createGlobMatcher(rule.matchSymbolFilePath) }
        : {}),
    }));
}

export function normalizeNodeLegendRules(
  activeRules: readonly NodeLegendRuleInput[],
): CompiledNodeLegendRule[] {
  if (activeRules.every(isCompiledNodeLegendRule)) {
    return [...activeRules];
  }

  return compileNodeLegendRules(activeRules.filter((rule): rule is IGroup =>
    !isCompiledNodeLegendRule(rule),
  ));
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

function isCompiledNodeLegendRule(rule: NodeLegendRuleInput): rule is CompiledNodeLegendRule {
  return 'patternMatches' in rule && 'rule' in rule;
}
