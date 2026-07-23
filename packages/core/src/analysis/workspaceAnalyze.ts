import type { IFileAnalysisResult, IPluginNodeType } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../discovery/contracts';
import type { IGraphData } from '../graph/contracts';
import { throwIfWorkspaceAnalysisAborted } from './abort';
import type { IWorkspaceFileAnalysisResult } from './fileAnalysis';
import type { IProjectedConnection } from './projectedConnection';
import {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
  type WorkspacePipelineDiscoveryConfig,
  type WorkspacePipelineDiscoveryDependencies,
} from './workspaceDiscovery';

export interface WorkspacePipelineEventBus {
  emit(event: string, payload: unknown): void;
}

export interface WorkspacePipelineAnalysisSource {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal,
    pluginIds?: readonly string[],
    disabledPlugins?: Set<string>,
    options?: { forceAnalyze?: boolean },
  ): Promise<IWorkspaceFileAnalysisResult>;
  _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _eventBus?: WorkspacePipelineEventBus;
  _completeGraphData?: IGraphData;
  _lastDiscoveredDirectories: string[];
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: Map<string, IFileAnalysisResult>;
  _lastFileConnections: Map<string, IProjectedConnection[]>;
  _lastGitIgnoredPaths?: string[];
  _lastWorkspaceRoot: string;
  _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
    disabledPlugins?: Set<string>,
  ): Promise<void>;
  getPluginFilterPatterns(disabledPlugins?: ReadonlySet<string>): string[];
  _listPluginNodeTypes?(
    disabledPlugins?: ReadonlySet<string>,
  ): readonly IPluginNodeType[];
}

export interface WorkspacePipelineAnalysisDependencies
  extends WorkspacePipelineDiscoveryDependencies<IDiscoveredFile> {
  getConfig(): WorkspacePipelineDiscoveryConfig & {
    disabledCustomFilterPatterns?: string[];
    disabledPluginFilterPatterns?: string[];
    showOrphans: boolean;
  };
  getWorkspaceRoot(): string | undefined;
  logInfo(message: string): void;
  saveCache(
    graph: IGraphData,
    onProgress?: (progress: { current: number; total: number }) => void,
  ): void | Promise<void>;
  showWarningMessage(message: string): void;
  sendProgress?(progress: { phase: string; current: number; total: number }): void;
}

export async function analyzeWorkspaceWithAnalyzer(
  source: WorkspacePipelineAnalysisSource,
  dependencies: WorkspacePipelineAnalysisDependencies,
  _filterPatterns: string[] = [],
  disabledPlugins: Set<string> = new Set(),
  signal?: AbortSignal,
): Promise<IGraphData> {
  throwIfWorkspaceAnalysisAborted(signal);

  const workspaceRoot = dependencies.getWorkspaceRoot();
  if (!workspaceRoot) {
    dependencies.logInfo('[CodeGraphy] No workspace folder open');
    return { nodes: [], edges: [] };
  }

  const config = dependencies.getConfig();
  dependencies.sendProgress?.({
    phase: 'Discovering Files',
    current: 0,
    total: 1,
  });
  const discoveryResult = await discoverWorkspacePipelineFiles(
    dependencies,
    workspaceRoot,
    config,
    signal,
  );
  dependencies.sendProgress?.({
    phase: 'Discovering Files',
    current: 1,
    total: 1,
  });

  throwIfWorkspaceAnalysisAborted(signal);

  if (discoveryResult.limitReached) {
    dependencies.showWarningMessage(
      formatWorkspacePipelineLimitReachedMessage(
        discoveryResult.totalFound,
        config.maxFiles,
      ),
    );
  }

  dependencies.logInfo(
    `[CodeGraphy] Discovered ${discoveryResult.files.length} files in ${discoveryResult.durationMs}ms`,
  );
  source._eventBus?.emit('analysis:started', {
    fileCount: discoveryResult.files.length,
  });

  dependencies.sendProgress?.({
    phase: 'Preparing Analysis',
    current: 0,
    total: 1,
  });
  const analysisResult = await source._analyzeFiles(
    discoveryResult.files,
    workspaceRoot,
    progress => {
      dependencies.sendProgress?.({
        phase: 'Analyzing Files',
        current: progress.current,
        total: progress.total,
      });
    },
    signal,
    undefined,
    disabledPlugins,
  );

  throwIfWorkspaceAnalysisAborted(signal);

  source._lastFileAnalysis = analysisResult.fileAnalysis;
  source._lastFileConnections = analysisResult.fileConnections;
  source._lastDiscoveredDirectories = discoveryResult.directories ?? [];
  source._lastDiscoveredFiles = discoveryResult.files;
  source._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
  source._lastWorkspaceRoot = workspaceRoot;

  dependencies.sendProgress?.({
    phase: 'Building Graph',
    current: 0,
    total: 1,
  });
  const graphData = source._buildGraphDataFromAnalysis(
    analysisResult.fileAnalysis,
    workspaceRoot,
    config.showOrphans,
    disabledPlugins,
  );
  dependencies.sendProgress?.({
    phase: 'Building Graph',
    current: 1,
    total: 1,
  });

  dependencies.sendProgress?.({
    phase: 'Saving Graph Cache',
    current: 0,
    total: 1,
  });
  await dependencies.saveCache(
    source._completeGraphData ?? graphData,
    progress => {
      dependencies.sendProgress?.({
        phase: 'Saving Graph Cache',
        current: progress.current,
        total: progress.total,
      });
    },
  );
  dependencies.sendProgress?.({
    phase: 'Saving Graph Cache',
    current: 1,
    total: 1,
  });
  dependencies.logInfo(
    `[CodeGraphy] Graph built: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`,
  );

  source._eventBus?.emit('analysis:completed', {
    graph: {
      nodes: graphData.nodes.map(node => ({ id: node.id })),
      edges: graphData.edges.map(edge => ({ id: edge.id })),
    },
    duration: 0,
  });

  return graphData;
}
