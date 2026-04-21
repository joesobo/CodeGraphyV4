import type { MaterialMatch } from './model';
import { getMaterialBaseName, normalizePathSeparators } from './paths';

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
  const context = getPathMatchContext(subjectPath);
  let bestMatch: MaterialMatch | undefined;

  for (const [ruleKey, iconName] of Object.entries(rules)) {
    const match = createPathMatch(context, ruleKey, iconName, kind);
    if (!match || (bestMatch && bestMatch.key.length >= match.key.length)) {
      continue;
    }

    bestMatch = match;
  }

  return bestMatch;
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

function createPathMatch(
  context: PathMatchContext,
  ruleKey: string,
  iconName: string,
  kind: PathMatchKind,
): MaterialMatch | undefined {
  const normalizedRule = normalizePathSeparators(ruleKey);
  const lowerRule = normalizedRule.toLowerCase();
  if (!matchesPathRule(context, normalizedRule, lowerRule)) {
    return undefined;
  }

  return {
    iconName,
    key: resolveMatchedPathKey(context, normalizedRule, lowerRule),
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
