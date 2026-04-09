import type { IConnection, IPlugin } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/types';
import { buildWorkspaceGraphData } from './data';

const VISITS_KEY = 'codegraphy.fileVisits';

interface WorkspacePipelineGraphWorkspaceState {
  get<T>(key: string): T | undefined;
}

export interface WorkspacePipelineGraphSource {
  _cache: {
    files: Record<string, { size?: number }>;
  };
  _context: {
    workspaceState: WorkspacePipelineGraphWorkspaceState;
  };
  _registry: {
    getPluginForFile(absolutePath: string): IPlugin | undefined;
  };
}

export interface WorkspacePipelineGraphDependencies {
  cacheFiles: Record<string, { size?: number }>;
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IConnection[]>;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
  showOrphans: boolean;
  workspaceRoot: string;
  workspaceState: WorkspacePipelineGraphWorkspaceState;
}

export function buildWorkspacePipelineGraph(
  dependencies: WorkspacePipelineGraphDependencies,
): IGraphData {
  const visitCounts =
    dependencies.workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};

  return buildWorkspaceGraphData({
    cacheFiles: dependencies.cacheFiles,
    disabledPlugins: dependencies.disabledPlugins,
    fileConnections: dependencies.fileConnections,
    showOrphans: dependencies.showOrphans,
    visitCounts,
    workspaceRoot: dependencies.workspaceRoot,
    getPluginForFile: dependencies.getPluginForFile,
  });
}

export function buildWorkspacePipelineGraphForSource(
  source: WorkspacePipelineGraphSource,
  fileConnections: Map<string, IConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string>,
): IGraphData {
  return buildWorkspacePipelineGraph({
    cacheFiles: source._cache.files,
    disabledPlugins,
    fileConnections,
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    showOrphans,
    workspaceRoot,
    workspaceState: source._context.workspaceState,
  });
}
