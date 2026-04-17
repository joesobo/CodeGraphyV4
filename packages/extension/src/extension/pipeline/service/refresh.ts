import type { IDiscoveredFile } from '../../../core/discovery/contracts';
import type {
  IFileAnalysisResult,
  IProjectedConnection,
} from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IWorkspaceFileAnalysisResult } from '../fileAnalysis';
import {
  mapDiscoveredWorkspaceFilesByRelativePath,
  mergeDiscoveredWorkspaceFiles,
  selectDiscoveredWorkspaceFiles,
} from './cache/changedFiles';

interface WorkspacePipelineRefreshSource {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal,
  ): Promise<IWorkspaceFileAnalysisResult>;
  _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: Map<string, IFileAnalysisResult>;
  _lastFileConnections: Map<string, IProjectedConnection[]>;
  _lastWorkspaceRoot: string;
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

interface WorkspacePipelineRefreshDependencies {
  config: { showOrphans: boolean };
  disabledPlugins: Set<string>;
  discoveredFiles: IDiscoveredFile[];
  filePaths: readonly string[];
  filterPatterns: string[];
  notifyFilesChanged(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string,
  ): Promise<{ additionalFilePaths: string[]; requiresFullRefresh: boolean }>;
  onProgress?: (progress: { phase: string; current: number; total: number }) => void;
  persistCache(): void;
  persistIndexMetadata(): Promise<void>;
  signal?: AbortSignal;
  toWorkspaceRelativePath(workspaceRoot: string, filePath: string): string | undefined;
  workspaceRoot: string;
}

export async function refreshWorkspacePipelineChangedFiles(
  source: WorkspacePipelineRefreshSource,
  dependencies: WorkspacePipelineRefreshDependencies,
): Promise<IGraphData> {
  const discoveredByRelativePath = mapDiscoveredWorkspaceFilesByRelativePath(
    dependencies.discoveredFiles,
  );
  const changedFiles = selectDiscoveredWorkspaceFiles(
    dependencies.workspaceRoot,
    dependencies.filePaths,
    discoveredByRelativePath,
    (workspaceRoot, filePath) =>
      dependencies.toWorkspaceRelativePath(workspaceRoot, filePath),
  );
  const changedAnalysisFiles = await source._readAnalysisFiles(changedFiles);
  const incrementalLifecycle = await dependencies.notifyFilesChanged(
    changedAnalysisFiles,
    dependencies.workspaceRoot,
  );

  if (incrementalLifecycle.requiresFullRefresh) {
    return source.analyze(
      dependencies.filterPatterns,
      dependencies.disabledPlugins,
      dependencies.signal,
      progress => {
        dependencies.onProgress?.({
          ...progress,
          phase: 'Applying Changes',
        });
      },
    );
  }

  const filesToAnalyze = mergeDiscoveredWorkspaceFiles(
    changedFiles,
    incrementalLifecycle.additionalFilePaths,
    discoveredByRelativePath,
  );
  source._lastDiscoveredFiles = dependencies.discoveredFiles;
  source._lastWorkspaceRoot = dependencies.workspaceRoot;

  if (filesToAnalyze.length === 0) {
    return source._buildGraphDataFromAnalysis(
      source._lastFileAnalysis,
      dependencies.workspaceRoot,
      dependencies.config.showOrphans,
      dependencies.disabledPlugins,
    );
  }

  source.invalidateWorkspaceFiles(filesToAnalyze.map((file) => file.absolutePath));
  dependencies.onProgress?.({
    phase: 'Applying Changes',
    current: 0,
    total: filesToAnalyze.length,
  });

  const analysisResult = await source._analyzeFiles(
    filesToAnalyze,
    dependencies.workspaceRoot,
    progress => {
      dependencies.onProgress?.({
        phase: 'Applying Changes',
        current: progress.current,
        total: progress.total,
      });
    },
    dependencies.signal,
  );

  for (const [filePath, analysis] of analysisResult.fileAnalysis) {
    source._lastFileAnalysis.set(filePath, analysis);
  }
  for (const [filePath, connections] of analysisResult.fileConnections) {
    source._lastFileConnections.set(filePath, connections);
  }

  dependencies.persistCache();
  const graphData = source._buildGraphDataFromAnalysis(
    source._lastFileAnalysis,
    dependencies.workspaceRoot,
    dependencies.config.showOrphans,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
}
