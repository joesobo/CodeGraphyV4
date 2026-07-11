import * as path from 'path';
import { minimatch } from 'minimatch';
import type { IFilesExcludeRule } from '../contracts';
import { normalizeDiscoveryPath } from '../pathMatching';

function matchesFilesExcludePattern(relativePath: string, pattern: string): boolean {
  return minimatch(normalizeDiscoveryPath(relativePath), pattern, {
    dot: true,
    nocomment: true,
    nonegate: true,
  });
}

function getPathAndAncestorDirectories(relativePath: string): string[] {
  const normalizedPath = normalizeDiscoveryPath(relativePath);
  const parts = normalizedPath.split('/');
  const candidates = [normalizedPath];
  for (let end = parts.length - 1; end > 0; end--) {
    candidates.push(parts.slice(0, end).join('/'));
  }
  return candidates;
}

function resolveConditionalSiblingName(relativePath: string, when: string): string {
  const fileName = path.posix.basename(normalizeDiscoveryPath(relativePath));
  const extension = path.posix.extname(fileName);
  const basename = extension ? fileName.slice(0, -extension.length) : fileName;
  return when.split('$(basename)').join(basename);
}

function ruleExcludesPath(
  relativePath: string,
  rule: IFilesExcludeRule,
  siblingNames: ReadonlySet<string>,
): boolean {
  if (rule.when) {
    return matchesFilesExcludePattern(relativePath, rule.pattern)
      && siblingNames.has(resolveConditionalSiblingName(relativePath, rule.when));
  }

  return getPathAndAncestorDirectories(relativePath)
    .some(candidate => matchesFilesExcludePattern(candidate, rule.pattern));
}

export function isFilesExcludedPath(
  relativePath: string,
  rules: readonly IFilesExcludeRule[],
  siblingNames: ReadonlySet<string>,
): boolean {
  return rules.some(rule => ruleExcludesPath(relativePath, rule, siblingNames));
}
