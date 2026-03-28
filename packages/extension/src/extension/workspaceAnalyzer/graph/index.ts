import type { IConnection, IPlugin } from '../../../core/plugins/types';
import type { IGraphData } from '../../../shared/contracts';
import { buildWorkspaceGraphData } from './data';

const VISITS_KEY = 'codegraphy.fileVisits';

interface WorkspaceAnalyzerGraphWorkspaceState {
  get<T>(key: string): T | undefined;
}

export interface WorkspaceAnalyzerGraphSource {
  _cache: {
    files: Record<string, { size?: number }>;
  };
  _context: {
    workspaceState: WorkspaceAnalyzerGraphWorkspaceState;
  };
  _registry: {
    getPluginForFile(absolutePath: string): IPlugin | undefined;
  };
}

export interface WorkspaceAnalyzerGraphDependencies {
  cacheFiles: Record<string, { size?: number }>;
  disabledPlugins: ReadonlySet<string>;
  disabledRules: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IConnection[]>;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
  showOrphans: boolean;
  workspaceRoot: string;
  workspaceState: WorkspaceAnalyzerGraphWorkspaceState;
}

export function buildWorkspaceAnalyzerGraph(
  dependencies: WorkspaceAnalyzerGraphDependencies,
): IGraphData {
  const visitCounts =
    dependencies.workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};

  return buildWorkspaceGraphData({
    cacheFiles: dependencies.cacheFiles,
    disabledPlugins: dependencies.disabledPlugins,
    disabledRules: dependencies.disabledRules,
    fileConnections: dependencies.fileConnections,
    showOrphans: dependencies.showOrphans,
    visitCounts,
    workspaceRoot: dependencies.workspaceRoot,
    getPluginForFile: dependencies.getPluginForFile,
  });
}

export function buildWorkspaceAnalyzerGraphForSource(
  source: WorkspaceAnalyzerGraphSource,
  fileConnections: Map<string, IConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledRules: Set<string>,
  disabledPlugins: Set<string>,
): IGraphData {
  return buildWorkspaceAnalyzerGraph({
    cacheFiles: source._cache.files,
    disabledPlugins,
    disabledRules,
    fileConnections,
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    showOrphans,
    workspaceRoot,
    workspaceState: source._context.workspaceState,
  });
}
