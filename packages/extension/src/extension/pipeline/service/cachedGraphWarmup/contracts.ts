import {
  createWorkspacePluginAnalysisContext,
  type IDiscoveredFile,
} from '@codegraphy-dev/core';

export interface CachedGraphWarmupRegistry {
  analyzeFileResultForPlugins?: (
    absolutePath: string,
    content: string,
    workspaceRoot: string,
    pluginIds: readonly string[],
    analysisContext: ReturnType<typeof createWorkspacePluginAnalysisContext>,
    options: { disabledPlugins: Set<string> },
  ) => Promise<unknown>;
  supportsFile?: (filePath: string) => boolean;
}

export interface CachedGraphWarmupDiscovery {
  readContent(file: IDiscoveredFile): Promise<string>;
}

export interface CachedGraphAnalysisWarmupInput {
  analysisContext: ReturnType<typeof createWorkspacePluginAnalysisContext>;
  disabledPluginSnapshot: Set<string>;
  file: IDiscoveredFile;
  pluginIds: readonly string[];
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface CachedGraphAnalysisWarmupOptions {
  disabledPlugins: Set<string>;
  files: readonly IDiscoveredFile[];
  getActiveAnalysisPluginIds(
    disabledPluginSnapshot: Set<string>,
  ): readonly string[];
  registry: CachedGraphWarmupRegistry;
  signal?: AbortSignal;
  workspaceRoot: string;
}
