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

const DEFAULT_EXCLUDE_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  '.git',
  '.codegraphy',
  '.turbo',
  '.worktrees',
  'coverage',
]);

const DEFAULT_EXCLUDE_BASENAMES = new Set([
  '.DS_Store',
]);

const DEFAULT_EXCLUDE_SUFFIXES = [
  '.min.js',
  '.bundle.js',
  '.map',
];

export function normalizeDiscoveryPath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

export function isDefaultExcludedPath(relativePath: string): boolean {
  const normalizedPath = normalizeDiscoveryPath(relativePath);
  const segments = normalizedPath.split('/').filter(Boolean);
  const basename = segments.at(-1) ?? normalizedPath;

  return segments.some(segment => DEFAULT_EXCLUDE_SEGMENTS.has(segment))
    || DEFAULT_EXCLUDE_BASENAMES.has(basename)
    || DEFAULT_EXCLUDE_SUFFIXES.some(suffix => basename.endsWith(suffix));
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
