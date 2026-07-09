import type {
  IFileAnalysisResult,
  IPlugin,
} from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import { captureActivePerfMetricEmitter } from '../diagnostics/perfMetrics';
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
  _lastGitIgnoredPaths?: readonly string[];
}

export interface WorkspacePipelineGraphDependencies {
  cacheFiles: Record<string, { size?: number }>;
  churnCounts: Record<string, number>;
  directoryPaths?: readonly string[];
  disabledPlugins: ReadonlySet<string>;
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>;
  gitIgnoredPaths?: readonly string[];
  getPluginForFile: (absolutePath: string) => IPlugin | undefined;
  showOrphans: boolean;
  workspaceRoot: string;
}

export interface WorkspacePipelineGraphAnalysisDependencies extends Omit<WorkspacePipelineGraphDependencies, 'fileConnections'> {
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>;
  nodeVisibility?: Readonly<Record<string, boolean>>;
}

export function buildWorkspacePipelineGraph(
  dependencies: WorkspacePipelineGraphDependencies,
): IGraphData {
  const emitPerfMetric = captureActivePerfMetricEmitter();
  const graphDependencies = {
    cacheFiles: dependencies.cacheFiles,
    churnCounts: dependencies.churnCounts,
    directoryPaths: dependencies.directoryPaths ?? [],
    gitIgnoredPaths: dependencies.gitIgnoredPaths ?? [],
    disabledPlugins: dependencies.disabledPlugins,
    fileConnections: dependencies.fileConnections,
    showOrphans: dependencies.showOrphans,
    workspaceRoot: dependencies.workspaceRoot,
    getPluginForFile: dependencies.getPluginForFile,
  };
  if (!emitPerfMetric) {
    return buildWorkspaceGraphData(graphDependencies);
  }

  const startedAt = performance.now();
  const graph = buildWorkspaceGraphData(graphDependencies);
  emitPerfMetric({
    metric: 'graphBuildMs',
    unit: 'ms',
    value: performance.now() - startedAt,
    dimension: 'workspace-pipeline-connections',
  });
  return graph;
}

export function buildWorkspacePipelineGraphFromAnalysis(
  dependencies: WorkspacePipelineGraphAnalysisDependencies,
): IGraphData {
  const emitPerfMetric = captureActivePerfMetricEmitter();
  const graphDependencies = {
    cacheFiles: dependencies.cacheFiles,
    churnCounts: dependencies.churnCounts,
    directoryPaths: dependencies.directoryPaths ?? [],
    gitIgnoredPaths: dependencies.gitIgnoredPaths ?? [],
    disabledPlugins: dependencies.disabledPlugins,
    fileAnalysis: dependencies.fileAnalysis,
    nodeVisibility: dependencies.nodeVisibility,
    showOrphans: dependencies.showOrphans,
    workspaceRoot: dependencies.workspaceRoot,
    getPluginForFile: dependencies.getPluginForFile,
  };
  if (!emitPerfMetric) {
    return buildWorkspaceGraphDataFromAnalysis(graphDependencies);
  }

  const startedAt = performance.now();
  const graph = buildWorkspaceGraphDataFromAnalysis(graphDependencies);
  emitPerfMetric({
    metric: 'graphBuildMs',
    unit: 'ms',
    value: performance.now() - startedAt,
    dimension: 'workspace-pipeline-analysis',
  });
  return graph;
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
    gitIgnoredPaths: source._lastGitIgnoredPaths ?? [],
    disabledPlugins,
    fileConnections,
    getPluginForFile: absolutePath => source._registry.getPluginForFile(absolutePath),
    showOrphans,
    workspaceRoot,
  });
}
