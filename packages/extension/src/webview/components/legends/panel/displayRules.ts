import type { IGroup } from '../../../../shared/settings/groups';
import type { LegendDisplayRule, LegendTargetSection } from './types';

export function shouldRenderRuleInSection(rule: IGroup, target: LegendTargetSection): boolean {
  const ruleTarget = rule.target ?? 'node';
  if (target === 'edge') {
    return ruleTarget !== 'node';
  }

  return ruleTarget !== 'edge';
}

export function replaceSectionRules(
  rules: IGroup[],
  target: LegendTargetSection,
  nextSectionRules: IGroup[],
): IGroup[] {
  const remainingRules = rules.filter(rule => !shouldRenderRuleInSection(rule, target));
  return [...remainingRules, ...nextSectionRules];
}

export function resolveDisplayRules(
  legends: IGroup[],
  target: LegendTargetSection,
): LegendDisplayRule[] {
  const sectionRules = legends.filter((rule) => shouldRenderRuleInSection(rule, target));
  const rulesById = new Map<string, LegendDisplayRule>();

  for (const rule of sectionRules) {
    const existing = rulesById.get(rule.id);
    if (!existing) {
      rulesById.set(rule.id, rule);
      continue;
    }

    rulesById.set(rule.id, {
      ...rule,
      ...existing,
      isPluginDefault: rule.isPluginDefault || existing.isPluginDefault,
      pluginName: existing.pluginName ?? rule.pluginName,
      imagePath: existing.imagePath ?? rule.imagePath,
      imageUrl: existing.imageUrl ?? rule.imageUrl,
    });
  }

  return [...rulesById.values()];
}
