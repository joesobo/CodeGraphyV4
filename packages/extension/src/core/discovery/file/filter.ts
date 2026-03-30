/**
 * @fileoverview Pure file inclusion predicate extracted from FileDiscovery.
 * Determines whether a discovered file should be included based on patterns,
 * extensions, and gitignore.
 * @module core/discovery/file/filter
 */

import * as path from 'path';
import { matchesAnyPattern } from '../pathMatching';

/** Gitignore checker interface — subset used by FileDiscovery. */
export interface IGitignoreChecker {
  ignores(relativePath: string): boolean;
}

/** Options for the shouldIncludeFile predicate. */
export interface IFileFilterOptions {
  /** Compiled include patterns */
  includePatterns: string[];
  /** Compiled exclude patterns (default + custom combined) */
  excludePatterns: string[];
  /** Extensions to allow; empty means all. */
  extensions: string[];
  /** Optional gitignore checker — when present, ignored files are excluded. */
  gitignore: IGitignoreChecker | null;
}

/**
 * Returns true if a file should be included in discovery results.
 *
 * @param relativePath - Relative path from workspace root
 * @param absolutePath - Absolute path (used only to derive extension)
 * @param options - Filter configuration
 */
export function shouldIncludeFile(
  relativePath: string,
  absolutePath: string,
  options: IFileFilterOptions,
): boolean {
  const { includePatterns, excludePatterns, extensions, gitignore } = options;

  if (gitignore && gitignore.ignores(relativePath)) {
    return false;
  }

  if (matchesAnyPattern(relativePath, excludePatterns)) {
    return false;
  }

  if (!matchesAnyPattern(relativePath, includePatterns)) {
    return false;
  }

  if (extensions.length > 0) {
    const ext = path.extname(absolutePath).toLowerCase();
    if (!extensions.includes(ext)) {
      return false;
    }
  }

  return true;
}
