import type { LegendDisplayRule } from './contracts';

export interface LegendRuleRowModel {
  index: number;
  rule: LegendDisplayRule;
}

export interface LegendRuleGroup {
  id: string;
  label: string;
  rules: LegendRuleRowModel[];
}

function isBuiltInRule(rule: LegendDisplayRule): boolean {
  return rule.id.startsWith('default:');
}

function getPluginGroupId(rule: LegendDisplayRule): string {
  return rule.pluginId ?? rule.pluginName ?? 'unknown';
}

function getPluginGroupLabel(rule: LegendDisplayRule): string {
  return rule.pluginName ?? 'Unknown plugin';
}

export function createCustomRuleGroup(rules: LegendDisplayRule[]): LegendRuleGroup {
  return {
    id: 'custom',
    label: 'Custom',
    rules: rules
      .map((rule, index) => ({ index, rule }))
      .filter(({ rule }) => !rule.isPluginDefault),
  };
}

export function createBuiltInRuleGroups(rules: LegendDisplayRule[]): LegendRuleGroup[] {
  const groupsById = new Map<string, LegendRuleGroup>();

  rules.forEach((rule, index) => {
    if (!rule.isPluginDefault || !isBuiltInRule(rule)) {
      return;
    }

    const id = getPluginGroupId(rule);
    const existingGroup = groupsById.get(id);
    if (existingGroup) {
      existingGroup.rules.push({ index, rule });
      return;
    }

    groupsById.set(id, {
      id,
      label: getPluginGroupLabel(rule),
      rules: [{ index, rule }],
    });
  });

  return [...groupsById.values()];
}

export function createPluginRuleGroups(rules: LegendDisplayRule[]): LegendRuleGroup[] {
  const groupsById = new Map<string, LegendRuleGroup>();

  rules.forEach((rule, index) => {
    if (!rule.isPluginDefault || isBuiltInRule(rule)) {
      return;
    }

    const id = getPluginGroupId(rule);
    const existingGroup = groupsById.get(id);
    if (existingGroup) {
      existingGroup.rules.push({ index, rule });
      return;
    }

    groupsById.set(id, {
      id,
      label: getPluginGroupLabel(rule),
      rules: [{ index, rule }],
    });
  });

  return [...groupsById.values()];
}
