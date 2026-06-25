import { minimatch } from 'minimatch';
import { normalizeDiscoveryPath } from './pathNormalization.js';

export { DEFAULT_EXCLUDE } from './pathExclusions.js';
export { isDefaultExcludedPath } from './defaultExcludedPath.js';
export { normalizeDiscoveryPath } from './pathNormalization.js';
export { shouldSkipKnownDirectory } from './knownDirectory.js';

export function matchesAnyPattern(relativePath: string, patterns: readonly string[]): boolean {
  const normalizedPath = normalizeDiscoveryPath(relativePath);

  return patterns.some((pattern) =>
    minimatch(normalizedPath, pattern, { dot: true, matchBase: true })
  );
}
