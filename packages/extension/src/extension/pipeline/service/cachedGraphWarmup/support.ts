import type { IDiscoveredFile } from '@codegraphy-dev/core';
import type { CachedGraphWarmupRegistry } from './contracts';

export function getSupportedCachedGraphAnalysisWarmupFiles(
  registry: CachedGraphWarmupRegistry,
  files: readonly IDiscoveredFile[],
): IDiscoveredFile[] {
  return files.filter(file =>
    registry.supportsFile?.(file.absolutePath)
    || registry.supportsFile?.(file.relativePath),
  );
}
