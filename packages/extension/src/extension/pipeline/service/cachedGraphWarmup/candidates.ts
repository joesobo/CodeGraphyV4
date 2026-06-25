import type { IDiscoveredFile } from '@codegraphy-dev/core';

const CACHED_GRAPH_ANALYSIS_WARMUP_IGNORED_SEGMENTS = new Set([
  '.codegraphy',
  '.git',
  '.stryker-tmp',
  '.turbo',
  '.worktrees',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'reports',
]);

export function isCachedGraphAnalysisWarmupCandidate(file: IDiscoveredFile): boolean {
  const segments = file.relativePath.replace(/\\/g, '/').split('/');
  return !segments.some(segment => CACHED_GRAPH_ANALYSIS_WARMUP_IGNORED_SEGMENTS.has(segment));
}
