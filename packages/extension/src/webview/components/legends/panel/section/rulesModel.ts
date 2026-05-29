import type { IGroup } from '../../../../../shared/settings/groups';
import type { LegendIconImport } from '../../../../../shared/protocol/webviewToExtension';
import { shouldRenderRuleInSection } from './displayRules';
import type { LegendRulesChange, LegendTargetSection } from './contracts';
import type { LegendRuleRowModel } from './groups';

export function emitRulesChange(
  onRulesChange: LegendRulesChange,
  rules: IGroup[],
  iconImports?: LegendIconImport[],
): void {
  if (iconImports?.length) {
    onRulesChange(rules, iconImports);
    return;
  }

  onRulesChange(rules);
}

export function getTargetRules(userRules: IGroup[], target: LegendTargetSection): IGroup[] {
  return userRules.filter((candidate) => shouldRenderRuleInSection(candidate, target));
}

export function replaceRule(rules: IGroup[], nextRule: IGroup): IGroup[] {
  return rules.map((candidate) => (candidate.id === nextRule.id ? nextRule : candidate));
}

export function areAllRulesEnabled(rules: LegendRuleRowModel[]): boolean {
  return rules.every(({ rule }) => !rule.disabled);
}

export function setRulesDisabled(
  ruleIds: Set<string>,
  rules: IGroup[],
  disabled: boolean,
): IGroup[] {
  return rules.map((rule) => {
    if (!ruleIds.has(rule.id)) {
      return rule;
    }

    return { ...rule, disabled };
  });
}
