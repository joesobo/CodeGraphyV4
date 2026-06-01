import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceFileAnalysisResult } from '../analysis/fileAnalysis';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IDiscoveredFile } from '../discovery/contracts';
import type { IGraphData } from '../graph/contracts';
import {
  mapDiscoveredWorkspaceIndexFilesByRelativePath,
  mergeDiscoveredWorkspaceIndexFiles,
  selectDiscoveredWorkspaceIndexFileChanges,
} from './changedFiles';

export interface WorkspaceIndexRefreshSource {
  _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal,
  ): Promise<IWorkspaceFileAnalysisResult>;
  _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
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

export interface WorkspaceIndexRefreshDependencies {
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
  workspaceRoot: string;
}

function analyzeWorkspaceIndexFromRefresh(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<IGraphData> {
  return source.analyze(
    dependencies.filterPatterns,
    dependencies.disabledPlugins,
    dependencies.signal,
    progress => {
      dependencies.onProgress?.({
        ...progress,
        phase: progress.phase || 'Applying Changes',
      });
    },
  );
}

function applyWorkspaceIndexAnalysisResult(
  source: WorkspaceIndexRefreshSource,
  analysisResult: IWorkspaceFileAnalysisResult,
): void {
  for (const [filePath, analysis] of analysisResult.fileAnalysis) {
    source._lastFileAnalysis.set(filePath, analysis);
  }
  for (const [filePath, connections] of analysisResult.fileConnections) {
    source._lastFileConnections.set(filePath, connections);
  }
}

export async function refreshWorkspaceIndexChangedFiles(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<IGraphData> {
  const discoveredByRelativePath = mapDiscoveredWorkspaceIndexFilesByRelativePath(
    dependencies.discoveredFiles,
  );
  const changeSelection = selectDiscoveredWorkspaceIndexFileChanges(
    dependencies.workspaceRoot,
    dependencies.filePaths,
    discoveredByRelativePath,
  );
  const changedFiles = changeSelection.files;

  if (changeSelection.unmatchedFilePaths.length > 0) {
    source.invalidateWorkspaceFiles(changeSelection.unmatchedFilePaths);
    return analyzeWorkspaceIndexFromRefresh(source, dependencies);
  }

  const changedAnalysisFiles = await source._readAnalysisFiles(changedFiles);
  const incrementalLifecycle = await dependencies.notifyFilesChanged(
    changedAnalysisFiles,
    dependencies.workspaceRoot,
  );

  if (incrementalLifecycle.requiresFullRefresh) {
    return analyzeWorkspaceIndexFromRefresh(source, dependencies);
  }

  const filesToAnalyze = mergeDiscoveredWorkspaceIndexFiles(
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

  applyWorkspaceIndexAnalysisResult(source, analysisResult);

  dependencies.persistCache();
  const graphData = source._buildGraphDataFromAnalysis(
    source._lastFileAnalysis,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
}
