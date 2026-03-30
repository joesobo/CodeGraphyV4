import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type { IConnection } from '../../../core/plugins/types/contracts';
import type { EventBus } from '../../../core/plugins/eventBus';
import type { IGraphData } from '../../../shared/graph/types';
import { throwIfWorkspaceAnalysisAborted } from '../abort';
import {
  discoverWorkspaceAnalyzerFiles,
  formatWorkspaceAnalyzerLimitReachedMessage,
  type WorkspaceAnalyzerDiscoveryConfig,
  type WorkspaceAnalyzerDiscoveryDependencies,
} from '../discovery';

export interface WorkspaceAnalyzerAnalysisSource {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
  ): Promise<Map<string, IConnection[]>>;
  _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledRules: Set<string>,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _eventBus?: EventBus;
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileConnections: Map<string, IConnection[]>;
  _lastWorkspaceRoot: string;
  _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
  ): Promise<void>;
  getPluginFilterPatterns(): string[];
}

export interface WorkspaceAnalyzerAnalysisDependencies
  extends WorkspaceAnalyzerDiscoveryDependencies<IDiscoveredFile> {
  getConfig(): WorkspaceAnalyzerDiscoveryConfig & { showOrphans: boolean };
  getWorkspaceRoot(): string | undefined;
  logInfo(message: string): void;
  saveCache(): void;
  showWarningMessage(message: string): void;
}

export async function analyzeWorkspaceWithAnalyzer(
  source: WorkspaceAnalyzerAnalysisSource,
  dependencies: WorkspaceAnalyzerAnalysisDependencies,
  filterPatterns: string[] = [],
  disabledRules: Set<string> = new Set(),
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
  const discoveryResult = await discoverWorkspaceAnalyzerFiles(
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
      formatWorkspaceAnalyzerLimitReachedMessage(
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
  const fileConnections = await source._analyzeFiles(
    discoveryResult.files,
    workspaceRoot,
    signal,
  );

  throwIfWorkspaceAnalysisAborted(signal);

  source._lastFileConnections = fileConnections;
  source._lastDiscoveredFiles = discoveryResult.files;
  source._lastWorkspaceRoot = workspaceRoot;

  const graphData = source._buildGraphData(
    fileConnections,
    workspaceRoot,
    config.showOrphans,
    disabledRules,
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
