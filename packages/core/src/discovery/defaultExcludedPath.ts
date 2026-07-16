import { normalizeDiscoveryPath } from './pathNormalization';

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

export function isDefaultExcludedPath(relativePath: string): boolean {
  const normalizedPath = normalizeDiscoveryPath(relativePath);
  const segments = normalizedPath.split('/').filter(Boolean);
  const basename = segments.at(-1) ?? normalizedPath;

  return segments.some(segment => DEFAULT_EXCLUDE_SEGMENTS.has(segment))
    || DEFAULT_EXCLUDE_BASENAMES.has(basename)
    || DEFAULT_EXCLUDE_SUFFIXES.some(suffix => basename.endsWith(suffix));
}
