import type { MaterialMatch } from './model';
import { getMaterialBaseName, normalizePathSeparators } from './paths';

type PathMatchKind = Extract<MaterialMatch['kind'], 'fileName' | 'folderName'>;

interface PathMatchContext {
  baseName: string;
  lowerBaseName: string;
  lowerSubjectPath: string;
  subjectPath: string;
}

interface MaterialPathRuleEntry {
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

export function findLongestPathMatch(
  subjectPath: string,
  rules: Record<string, string>,
  kind: PathMatchKind,
): MaterialMatch | undefined {
  return findLongestPathMatchWithMatcher(
    subjectPath,
    createMaterialPathRuleMatcher(rules),
    kind,
  );
}

export function findLongestPathMatchWithMatcher(
  subjectPath: string,
  matcher: MaterialPathRuleMatcher,
  kind: PathMatchKind,
): MaterialMatch | undefined {
  const context = getPathMatchContext(subjectPath);
  for (const rule of matcher.pathRulesByLowerBaseName.get(context.lowerBaseName) ?? []) {
    if (!matchesPathRule(context, rule.normalizedRule, rule.lowerRule)) {
      continue;
    }

    return createMaterialMatch(context, rule, kind);
  }

  const baseNameRule = matcher.baseNameRules.get(context.lowerBaseName);
  return baseNameRule
    ? createMaterialMatch(context, baseNameRule, kind)
    : undefined;
}

function getPathMatchContext(subjectPath: string): PathMatchContext {
  const normalizedPath = normalizePathSeparators(subjectPath);
  return {
    baseName: getMaterialBaseName(subjectPath),
    lowerBaseName: getMaterialBaseName(subjectPath).toLowerCase(),
    lowerSubjectPath: normalizedPath.toLowerCase(),
    subjectPath: normalizedPath,
  };
}

function createMaterialMatch(
  context: PathMatchContext,
  rule: MaterialPathRuleEntry,
  kind: PathMatchKind,
): MaterialMatch | undefined {
  return {
    iconName: rule.iconName,
    key: resolveMatchedPathKey(context, rule.normalizedRule, rule.lowerRule),
    kind,
  };
}

function matchesPathRule(
  context: PathMatchContext,
  normalizedRule: string,
  lowerRule: string,
): boolean {
  if (!normalizedRule.includes('/')) {
    return context.lowerBaseName === lowerRule;
  }

  return context.lowerSubjectPath === lowerRule || context.lowerSubjectPath.endsWith(`/${lowerRule}`);
}

function resolveMatchedPathKey(
  context: PathMatchContext,
  normalizedRule: string,
  lowerRule: string,
): string {
  if (!normalizedRule.includes('/')) {
    return context.baseName;
  }

  return context.lowerSubjectPath === lowerRule
    ? context.subjectPath
    : context.subjectPath.slice(-normalizedRule.length);
}
