import { minimatch } from 'minimatch';
import { normalizeDiscoveryPath } from './pathNormalization';

export { DEFAULT_EXCLUDE } from './pathExclusions';
export { isDefaultExcludedPath } from './defaultExcludedPath';
export { normalizeDiscoveryPath } from './pathNormalization';
export { shouldSkipKnownDirectory } from './knownDirectory';

export function matchesAnyPattern(relativePath: string, patterns: readonly string[]): boolean {
  const normalizedPath = normalizeDiscoveryPath(relativePath);

  return patterns.some((pattern) =>
    minimatch(normalizedPath, pattern, { dot: true, matchBase: true })
  );
}

export function matchesPathOrAncestor(
  relativePath: string,
  paths: ReadonlySet<string>,
): boolean {
  let candidate = normalizeDiscoveryPath(relativePath);
  while (candidate) {
    if (paths.has(candidate)) return true;
    const separatorIndex = candidate.lastIndexOf('/');
    if (separatorIndex < 0) return false;
    candidate = candidate.slice(0, separatorIndex);
  }
  return false;
}
