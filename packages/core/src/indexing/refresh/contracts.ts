import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceFileAnalysisResult } from '../../analysis/fileAnalysis';
import type { IProjectedConnection } from '../../analysis/projectedConnection';
import type { IDiscoveredFile } from '../../discovery/contracts';
import type { IGraphData } from '../../graph/contracts';

export type WorkspaceIndexPluginInfo = {
  plugin: {
    id: string;
    supportedExtensions: readonly string[];
  };
};

export interface WorkspaceIndexRefreshSource {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal,
    pluginIds?: readonly string[],
    disabledPlugins?: Set<string>,
  ): Promise<IWorkspaceFileAnalysisResult>;
  _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastDiscoveredDirectories: string[];
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: Map<string, IFileAnalysisResult>;
  _lastFileConnections: Map<string, IProjectedConnection[]>;
  _lastGraphData: IGraphData;
  _lastWorkspaceRoot: string;
  _patchGraphDataNodeMetrics?(
    this: void,
    graphData: IGraphData,
    filePaths: readonly string[],
  ): IGraphData;
  _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
    disabledPlugins?: Set<string>,
  ): Promise<void>;
  _readAnalysisFiles(
    files: IDiscoveredFile[],
  ): Promise<Array<{ absolutePath: string; relativePath: string; content: string }>>;
  analyze(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData>;
  invalidateWorkspaceFiles(filePaths: readonly string[]): string[];
}

export interface WorkspaceIndexRefreshDependencies {
  deferMetricOnlyIndexMetadata?: boolean;
  disabledPlugins: Set<string>;
  discoveredDirectories?: string[];
  discoveredFiles: IDiscoveredFile[];
  filePaths: readonly string[];
  filterPatterns: string[];
  notifyFilesChanged(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string,
    analysisContext?: undefined,
    disabledPlugins?: Set<string>,
  ): Promise<{ additionalFilePaths: string[]; requiresFullRefresh: boolean }>;
  onProgress?: (progress: { phase: string; current: number; total: number }) => void;
  onDeferredIndexMetadataError?(error: unknown): void;
  persistCache(): void;
  persistCachePatch?(patch: {
    deleteFilePaths: readonly string[];
    upsertFilePaths: readonly string[];
  }): void;
  persistIndexMetadata(): Promise<void>;
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface WorkspaceIndexAnalysisScopeRefreshDependencies {
  disabledPlugins: Set<string>;
  discoveredDirectories?: string[];
  discoveredFiles: IDiscoveredFile[];
  onProgress?: (progress: { phase: string; current: number; total: number }) => void;
  persistCache(): void;
  persistIndexMetadata(): Promise<void>;
  signal?: AbortSignal;
  workspaceRoot: string;
}

export interface WorkspaceIndexPluginRefreshDependencies
  extends WorkspaceIndexAnalysisScopeRefreshDependencies {
  pluginIds: readonly string[];
  pluginInfos: readonly WorkspaceIndexPluginInfo[];
}
