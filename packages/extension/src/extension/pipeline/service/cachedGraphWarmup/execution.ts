import { throwIfWorkspaceAnalysisAborted } from '@codegraphy-dev/core';
import type {
  CachedGraphAnalysisWarmupInput,
  CachedGraphWarmupDiscovery,
  CachedGraphWarmupRegistry,
} from './contracts';

export async function warmCachedGraphAnalysisFile(
  input: CachedGraphAnalysisWarmupInput,
  discovery: CachedGraphWarmupDiscovery,
  registry: CachedGraphWarmupRegistry,
): Promise<void> {
  if (typeof registry.analyzeFileResultForPlugins !== 'function') {
    return;
  }

  throwIfWorkspaceAnalysisAborted(input.signal);
  const content = await discovery.readContent(input.file);
  throwIfWorkspaceAnalysisAborted(input.signal);
  await registry.analyzeFileResultForPlugins(
    input.file.absolutePath,
    content,
    input.workspaceRoot,
    input.pluginIds,
    input.analysisContext,
    { disabledPlugins: input.disabledPluginSnapshot },
  );
}
