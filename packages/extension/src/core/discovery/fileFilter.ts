/**
 * @fileoverview Pure file-filtering function extracted from FileDiscovery.
 * Encapsulates gitignore / exclude / include / extension checks.
 * @module core/discovery/fileFilter
 */

import { Ignore } from 'ignore';
import { minimatch } from 'minimatch';

/**
 * Options that control whether a discovered file should be included.
 */
export interface FilterOptions {
  /** Gitignore instance (or null if gitignore is disabled). */
  gitignore: Ignore | null;
  /** Combined default + user exclude glob patterns. */
  allExclude: string[];
  /** Include glob patterns (default: ['**\/*']). */
  include: string[];
  /** Allowed file extensions (empty = all allowed). */
  extensions: string[];
  /** Current file extension (e.g. '.ts'). */
  fileExtension: string;
}

/**
 * Checks whether a discovered file at the given relative path should be included
 * in the discovery results.
 *
 * Returns `true` when the file passes all filters; `false` when it should be skipped.
 *
 * @param relativePath - Path relative to the workspace root (forward-slash normalisation happens internally).
 * @param options - Filter parameters.
 */
export function shouldIncludeFile(relativePath: string, options: FilterOptions): boolean {
  const { gitignore, allExclude, include, extensions, fileExtension } = options;

  // Check gitignore
  if (gitignore && gitignore.ignores(relativePath)) {
    return false;
  }

  // Check exclude patterns
  if (matchesAny(relativePath, allExclude)) {
    return false;
  }

  // Check include patterns
  if (!matchesAny(relativePath, include)) {
    return false;
  }

  // Check extension filter
  if (extensions.length > 0 && !extensions.includes(fileExtension)) {
    return false;
  }

  return true;
}

/**
 * Checks if a path matches any of the given glob patterns.
 */
function matchesAny(relativePath: string, patterns: string[]): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return patterns.some((pattern) =>
    minimatch(normalizedPath, pattern, { dot: true, matchBase: true })
  );
}
