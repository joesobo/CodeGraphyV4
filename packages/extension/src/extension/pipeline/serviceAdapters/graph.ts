import type { IFileAnalysisResult, IProjectedConnection } from '../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IWorkspaceAnalysisCache } from '../cache';
import {
  buildCompleteWorkspaceGraphData,
  buildWorkspacePipelineGraphFromAnalysis,
  buildWorkspacePipelineGraphForSource,
  type WorkspacePipelineGraphSource,
} from '../graph/build';
import { filterAnalysisByActivePlugins } from './pluginAnalysis';

export interface WorkspacePipelineGraphScopeOptions {
  nodeVisibility?: Readonly<Record<string, boolean>>;
}

function createGraphSource(
  cache: IWorkspaceAnalysisCache,
  registry: PluginRegistry,
  directoryPaths: readonly string[],
  gitIgnoredPaths: readonly string[],
): WorkspacePipelineGraphSource {
  return {
    _cache: cache,
    _lastDiscoveredDirectories: directoryPaths,
    _lastGitIgnoredPaths: gitIgnoredPaths,
    _registry: registry,
  };
}

export function buildWorkspacePipelineGraphData(
  cache: IWorkspaceAnalysisCache,
  registry: PluginRegistry,
  fileConnections: Map<string, IProjectedConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string> = new Set(),
  directoryPaths: readonly string[] = [],
  gitIgnoredPaths: readonly string[] = [],
): IGraphData {
  const activePluginIds = new Set(registry.list().map(info => info.plugin.id));
  const effectiveDisabledPlugins = new Set(disabledPlugins);
  for (const connections of fileConnections.values()) {
    for (const connection of connections) {
      if (connection.pluginId && !activePluginIds.has(connection.pluginId)) {
        effectiveDisabledPlugins.add(connection.pluginId);
      }
    }
  }
  return buildWorkspacePipelineGraphForSource(
    createGraphSource(cache, registry, directoryPaths, gitIgnoredPaths),
    fileConnections,
    workspaceRoot,
    showOrphans,
    effectiveDisabledPlugins,
  );
}

export function buildWorkspacePipelineGraphDataFromAnalysis(
  cache: IWorkspaceAnalysisCache,
  registry: PluginRegistry,
  fileAnalysis: Map<string, IFileAnalysisResult>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string> = new Set(),
  directoryPaths: readonly string[] = [],
  graphScope: WorkspacePipelineGraphScopeOptions = {},
  gitIgnoredPaths: readonly string[] = [],
): IGraphData {
  const activePluginIds = new Set(registry.list().map(info => info.plugin.id));
  const source = createGraphSource(cache, registry, directoryPaths, gitIgnoredPaths);
  return buildWorkspacePipelineGraphFromAnalysis({
    cacheFiles: source._cache.files,
    directoryPaths: source._lastDiscoveredDirectories ?? [],
    gitIgnoredPaths: source._lastGitIgnoredPaths ?? [],
    disabledPlugins,
    fileAnalysis: filterAnalysisByActivePlugins(fileAnalysis, activePluginIds, disabledPlugins),
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    nodeVisibility: graphScope.nodeVisibility,
    showOrphans,
    workspaceRoot,
  });
}

export function buildWorkspacePipelineCompleteGraphDataFromAnalysis(
  cache: IWorkspaceAnalysisCache,
  registry: PluginRegistry,
  fileAnalysis: Map<string, IFileAnalysisResult>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string> = new Set(),
  directoryPaths: readonly string[] = [],
  gitIgnoredPaths: readonly string[] = [],
): IGraphData {
  const activePluginIds = new Set(registry.list().map(info => info.plugin.id));
  const source = createGraphSource(cache, registry, directoryPaths, gitIgnoredPaths);
  return buildCompleteWorkspaceGraphData({
    cacheFiles: source._cache.files,
    directoryPaths: source._lastDiscoveredDirectories ?? [],
    gitIgnoredPaths: source._lastGitIgnoredPaths ?? [],
    disabledPlugins,
    fileAnalysis: filterAnalysisByActivePlugins(fileAnalysis, activePluginIds, disabledPlugins),
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    showOrphans,
    workspaceRoot,
  });
}
