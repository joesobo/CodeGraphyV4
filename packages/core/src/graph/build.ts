import type {
  IFileAnalysisResult,
  IPlugin,
} from '@codegraphy/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IGraphData } from './contracts';
import { buildWorkspaceGraphData, buildWorkspaceGraphDataFromAnalysis } from './data';

export interface WorkspacePipelineGraphSource {
  _cache: {
    files: Record<string, { size?: number }>;
  };
  _registry: {
    getPluginForFile(absolutePath: string): IPlugin | undefined;
  };
  _lastDiscoveredDirectories?: readonly string[];
}

export interface WorkspacePipelineGraphDependencies {
  cacheFiles: Record<string, { size?: number }>;
  churnCounts: Record<string, number>;
  directoryPaths?: readonly string[];
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
  showOrphans: boolean;
  workspaceRoot: string;
}

export interface WorkspacePipelineGraphAnalysisDependencies extends Omit<WorkspacePipelineGraphDependencies, 'fileConnections'> {
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>;
}

export function buildWorkspacePipelineGraph(
  dependencies: WorkspacePipelineGraphDependencies,
): IGraphData {
  return buildWorkspaceGraphData({
    cacheFiles: dependencies.cacheFiles,
    churnCounts: dependencies.churnCounts,
    directoryPaths: dependencies.directoryPaths ?? [],
    disabledPlugins: dependencies.disabledPlugins,
    fileConnections: dependencies.fileConnections,
    showOrphans: dependencies.showOrphans,
    workspaceRoot: dependencies.workspaceRoot,
    getPluginForFile: dependencies.getPluginForFile,
  });
}

export function buildWorkspacePipelineGraphFromAnalysis(
  dependencies: WorkspacePipelineGraphAnalysisDependencies,
): IGraphData {
  return buildWorkspaceGraphDataFromAnalysis({
    cacheFiles: dependencies.cacheFiles,
    churnCounts: dependencies.churnCounts,
    directoryPaths: dependencies.directoryPaths ?? [],
    disabledPlugins: dependencies.disabledPlugins,
    fileAnalysis: dependencies.fileAnalysis,
    showOrphans: dependencies.showOrphans,
    workspaceRoot: dependencies.workspaceRoot,
    getPluginForFile: dependencies.getPluginForFile,
  });
}

export function buildWorkspacePipelineGraphForSource(
  source: WorkspacePipelineGraphSource,
  fileConnections: Map<string, IProjectedConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string>,
  churnCounts: Record<string, number> = {},
): IGraphData {
  return buildWorkspacePipelineGraph({
    cacheFiles: source._cache.files,
    churnCounts,
    directoryPaths: source._lastDiscoveredDirectories ?? [],
    disabledPlugins,
    fileConnections,
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    showOrphans,
    workspaceRoot,
  });
}
