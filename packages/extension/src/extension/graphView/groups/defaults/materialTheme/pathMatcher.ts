import { getMaterialBaseName, normalizePathSeparators } from './paths';

export interface MaterialPathRuleEntry {
  iconName: string;
  lowerRule: string;
  normalizedRule: string;
}

export interface MaterialPathRuleMatcher {
  baseNameRules: Map<string, MaterialPathRuleEntry>;
  pathRules: MaterialPathRuleEntry[];
  pathRulesByLowerBaseName: Map<string, MaterialPathRuleEntry[]>;
}

export function createMaterialPathRuleMatcher(
  rules: Record<string, string>,
): MaterialPathRuleMatcher {
  const baseNameRules = new Map<string, MaterialPathRuleEntry>();
  const pathRules: MaterialPathRuleEntry[] = [];
  const pathRulesByLowerBaseName = new Map<string, MaterialPathRuleEntry[]>();

  for (const [ruleKey, iconName] of Object.entries(rules)) {
    const normalizedRule = normalizePathSeparators(ruleKey);
    const lowerRule = normalizedRule.toLowerCase();
    const entry = { iconName, lowerRule, normalizedRule };

    if (normalizedRule.includes('/')) {
      pathRules.push(entry);
      const lowerBaseName = getMaterialBaseName(normalizedRule).toLowerCase();
      const rulesForBaseName = pathRulesByLowerBaseName.get(lowerBaseName) ?? [];
      rulesForBaseName.push(entry);
      pathRulesByLowerBaseName.set(lowerBaseName, rulesForBaseName);
      continue;
    }

    baseNameRules.set(lowerRule, entry);
  }

  pathRules.sort((left, right) => right.normalizedRule.length - left.normalizedRule.length);
  for (const rulesForBaseName of pathRulesByLowerBaseName.values()) {
    rulesForBaseName.sort((left, right) => right.normalizedRule.length - left.normalizedRule.length);
  }

  return { baseNameRules, pathRules, pathRulesByLowerBaseName };
}
