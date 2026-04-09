import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type { IConnection, IFileAnalysisResult } from '../../../core/plugins/types/contracts';
import type { EventBus } from '../../../core/plugins/events/bus';
import type { IGraphData } from '../../../shared/graph/types';
import { throwIfWorkspaceAnalysisAborted } from '../abort';
import type { IWorkspaceFileAnalysisResult } from '../fileAnalysis';
import {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
  type WorkspacePipelineDiscoveryConfig,
  type WorkspacePipelineDiscoveryDependencies,
} from '../discovery';

export interface WorkspacePipelineAnalysisSource {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal,
  ): Promise<IWorkspaceFileAnalysisResult>;
  _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
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
  _eventBus?: EventBus;
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: Map<string, IFileAnalysisResult>;
  _lastFileConnections: Map<string, IConnection[]>;
  _lastWorkspaceRoot: string;
  _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
  ): Promise<void>;
  getPluginFilterPatterns(): string[];
}

export interface WorkspacePipelineAnalysisDependencies
  extends WorkspacePipelineDiscoveryDependencies<IDiscoveredFile> {
  getConfig(): WorkspacePipelineDiscoveryConfig & { showOrphans: boolean };
  getWorkspaceRoot(): string | undefined;
  logInfo(message: string): void;
  saveCache(): void;
  showWarningMessage(message: string): void;
  sendProgress?(progress: { phase: string; current: number; total: number }): void;
}

export async function analyzeWorkspaceWithAnalyzer(
  source: WorkspacePipelineAnalysisSource,
  dependencies: WorkspacePipelineAnalysisDependencies,
  filterPatterns: string[] = [],
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
  const discoveryResult = await discoverWorkspacePipelineFiles(
    dependencies,
    workspaceRoot,
    config,
    filterPatterns,
    source.getPluginFilterPatterns(),
    signal,
  );

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

  await source._preAnalyzePlugins(discoveryResult.files, workspaceRoot, signal);
  dependencies.sendProgress?.({
    phase: 'Analyzing Files',
    current: 0,
    total: discoveryResult.files.length,
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
  );

  throwIfWorkspaceAnalysisAborted(signal);

  source._lastFileAnalysis = analysisResult.fileAnalysis;
  source._lastFileConnections = analysisResult.fileConnections;
  source._lastDiscoveredFiles = discoveryResult.files;
  source._lastWorkspaceRoot = workspaceRoot;

  const graphData = source._buildGraphDataFromAnalysis(
    analysisResult.fileAnalysis,
    workspaceRoot,
    config.showOrphans,
    disabledPlugins,
  );

  dependencies.saveCache();
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
