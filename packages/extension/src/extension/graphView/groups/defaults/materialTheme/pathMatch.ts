import type { MaterialMatch } from './model';
import { getMaterialBaseName, normalizePathSeparators } from './paths';
import {
  createMaterialPathRuleMatcher,
  type MaterialPathRuleEntry,
  type MaterialPathRuleMatcher,
} from './pathMatcher';

export {
  createMaterialPathRuleMatcher,
  type MaterialPathRuleMatcher,
};

type PathMatchKind = Extract<MaterialMatch['kind'], 'fileName' | 'folderName'>;

interface PathMatchContext {
  baseName: string;
  lowerBaseName: string;
  lowerSubjectPath: string;
  subjectPath: string;
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
