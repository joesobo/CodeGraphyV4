/**
 * @fileoverview Path normalization and pattern matching helpers for discovery.
 * @module core/discovery/pathMatching
 */

import { minimatch } from 'minimatch';

export const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.git/**',
  '**/.codegraphy/**',
  '**/.turbo',
  '**/.turbo/**',
  '**/.worktrees',
  '**/.worktrees/**',
  '**/coverage/**',
  '**/.DS_Store',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.map',
];

export function normalizeDiscoveryPath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

export function matchesAnyPattern(relativePath: string, patterns: readonly string[]): boolean {
  const normalizedPath = normalizeDiscoveryPath(relativePath);

  return patterns.some((pattern) =>
    minimatch(normalizedPath, pattern, { dot: true, matchBase: true })
  );
}

export function shouldSkipKnownDirectory(relativePath: string): boolean {
  const normalizedRelative = normalizeDiscoveryPath(relativePath);

  return normalizedRelative === 'node_modules'
    || normalizedRelative === '.git'
    || normalizedRelative === '.codegraphy'
    || normalizedRelative.startsWith('node_modules/')
    || normalizedRelative.startsWith('.git/')
    || normalizedRelative.startsWith('.codegraphy/');
}
