import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { isCachedGraphAnalysisWarmupCandidate } from './candidates';
import type { CachedGraphWarmupRegistry } from './contracts';
import { selectMostRepresentedCachedGraphWarmupFile } from './ranking';
import { getSupportedCachedGraphAnalysisWarmupFiles } from './support';

export function selectCachedGraphAnalysisWarmupFile(
  registry: CachedGraphWarmupRegistry,
  files: readonly IDiscoveredFile[],
): IDiscoveredFile | undefined {
  if (typeof registry.supportsFile !== 'function') {
    return files[0];
  }

  const supportedFiles = getSupportedCachedGraphAnalysisWarmupFiles(
    registry,
    files.filter(isCachedGraphAnalysisWarmupCandidate),
  );
  if (supportedFiles.length === 0) {
    return getSupportedCachedGraphAnalysisWarmupFiles(registry, files)[0] ?? files[0];
  }

  return selectMostRepresentedCachedGraphWarmupFile(supportedFiles);
}
