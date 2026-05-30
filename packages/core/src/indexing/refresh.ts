import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceFileAnalysisResult } from '../analysis/fileAnalysis';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IDiscoveredFile } from '../discovery/contracts';
import type { IGraphData } from '../graph/contracts';
import { getWorkspaceIndexPluginMatchingFiles } from '../plugins/status/extensions';
import {
  mapDiscoveredWorkspaceIndexFilesByRelativePath,
  mergeDiscoveredWorkspaceIndexFiles,
  selectDiscoveredWorkspaceIndexFileChanges,
} from './changedFiles';

type WorkspaceIndexPluginInfo = {
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
  _lastWorkspaceRoot: string;
  _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
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
  disabledPlugins: Set<string>;
  discoveredDirectories?: string[];
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

function mergeWorkspaceIndexGraphData(
  primaryGraphData: IGraphData,
  fallbackGraphData: IGraphData,
): IGraphData {
  const nodeIds = new Set(primaryGraphData.nodes.map(node => node.id));
  const edgeIds = new Set(primaryGraphData.edges.map(edge =>
    edge.id ?? `${edge.from}\0${edge.to}\0${edge.kind}`,
  ));

  return {
    nodes: [
      ...primaryGraphData.nodes,
      ...fallbackGraphData.nodes.filter(node => !nodeIds.has(node.id)),
    ],
    edges: [
      ...primaryGraphData.edges,
      ...fallbackGraphData.edges.filter(edge =>
        !edgeIds.has(edge.id ?? `${edge.from}\0${edge.to}\0${edge.kind}`),
      ),
    ],
  };
}

function buildWorkspaceIndexGraphFromRefreshState(
  source: WorkspaceIndexRefreshSource,
  workspaceRoot: string,
  disabledPlugins: Set<string>,
): IGraphData {
  const analysisGraphData = source._buildGraphDataFromAnalysis(
    source._lastFileAnalysis,
    workspaceRoot,
    disabledPlugins,
  );
  if (source._lastFileConnections.size === 0) {
    return analysisGraphData;
  }

  return mergeWorkspaceIndexGraphData(
    analysisGraphData,
    source._buildGraphData(source._lastFileConnections, workspaceRoot, disabledPlugins),
  );
}

function updateWorkspaceIndexDiscoveryState(
  source: WorkspaceIndexRefreshSource,
  dependencies: Pick<
    WorkspaceIndexAnalysisScopeRefreshDependencies,
    'discoveredDirectories' | 'discoveredFiles' | 'workspaceRoot'
  >,
): void {
  source._lastDiscoveredDirectories = dependencies.discoveredDirectories ?? [];
  source._lastDiscoveredFiles = [...dependencies.discoveredFiles];
  source._lastWorkspaceRoot = dependencies.workspaceRoot;
}

function retainWorkspaceIndexDiscoveredFileConnections(
  source: WorkspaceIndexRefreshSource,
  discoveredFiles: readonly IDiscoveredFile[],
): void {
  for (const file of discoveredFiles) {
    if (!source._lastFileConnections.has(file.relativePath)) {
      source._lastFileConnections.set(file.relativePath, []);
    }
  }
}

function selectWorkspaceIndexPluginInfos(
  pluginInfos: readonly WorkspaceIndexPluginInfo[],
  pluginIds: readonly string[],
): WorkspaceIndexPluginInfo[] {
  const selectedPluginIds = new Set(pluginIds);
  return pluginInfos.filter(({ plugin }) => selectedPluginIds.has(plugin.id));
}

function selectWorkspaceIndexPluginFiles(
  pluginInfos: readonly WorkspaceIndexPluginInfo[],
  discoveredFiles: readonly IDiscoveredFile[],
): IDiscoveredFile[] {
  const matchingFilePaths = new Set<string>();

  for (const pluginInfo of pluginInfos) {
    for (const file of getWorkspaceIndexPluginMatchingFiles(pluginInfo, [...discoveredFiles])) {
      matchingFilePaths.add(file.relativePath);
    }
  }

  return discoveredFiles.filter(file => matchingFilePaths.has(file.relativePath));
}

export async function refreshWorkspaceIndexAnalysisScope(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexAnalysisScopeRefreshDependencies,
): Promise<IGraphData> {
  updateWorkspaceIndexDiscoveryState(source, dependencies);

  dependencies.onProgress?.({
    phase: 'Applying Scope',
    current: 0,
    total: dependencies.discoveredFiles.length,
  });

  const analysisResult = await source._analyzeFiles(
    [...dependencies.discoveredFiles],
    dependencies.workspaceRoot,
    progress => {
      dependencies.onProgress?.({
        phase: 'Applying Scope',
        current: progress.current,
        total: progress.total,
      });
    },
    dependencies.signal,
  );

  source._lastFileAnalysis = analysisResult.fileAnalysis;
  source._lastFileConnections = analysisResult.fileConnections;
  dependencies.persistCache();

  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
}

export async function refreshWorkspaceIndexPluginFiles(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexPluginRefreshDependencies,
): Promise<IGraphData> {
  updateWorkspaceIndexDiscoveryState(source, dependencies);
  retainWorkspaceIndexDiscoveredFileConnections(source, dependencies.discoveredFiles);

  const pluginInfos = selectWorkspaceIndexPluginInfos(
    dependencies.pluginInfos,
    dependencies.pluginIds,
  );
  const registeredPluginIds = pluginInfos.map(({ plugin }) => plugin.id);
  if (pluginInfos.length === 0) {
    const graphData = buildWorkspaceIndexGraphFromRefreshState(
      source,
      dependencies.workspaceRoot,
      dependencies.disabledPlugins,
    );
    await dependencies.persistIndexMetadata();
    return graphData;
  }

  const pluginFiles = selectWorkspaceIndexPluginFiles(pluginInfos, dependencies.discoveredFiles);
  if (pluginFiles.length > 0) {
    dependencies.onProgress?.({
      phase: 'Applying Plugin',
      current: 0,
      total: pluginFiles.length,
    });
    const analysisResult = await source._analyzeFiles(
      pluginFiles,
      dependencies.workspaceRoot,
      progress => {
        dependencies.onProgress?.({
          phase: 'Applying Plugin',
          current: progress.current,
          total: progress.total,
        });
      },
      dependencies.signal,
      registeredPluginIds,
    );

    for (const [filePath, analysis] of analysisResult.fileAnalysis) {
      source._lastFileAnalysis.set(filePath, analysis);
    }
    for (const [filePath, connections] of analysisResult.fileConnections) {
      source._lastFileConnections.set(filePath, connections);
    }
    dependencies.persistCache();
  }

  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
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
          phase: progress.phase || 'Applying Changes',
        });
      },
    );
  }

  const filesToAnalyze = mergeDiscoveredWorkspaceIndexFiles(
    changedFiles,
    incrementalLifecycle.additionalFilePaths,
    discoveredByRelativePath,
  );
  source._lastDiscoveredDirectories = dependencies.discoveredDirectories ?? [];
  source._lastDiscoveredFiles = dependencies.discoveredFiles;
  source._lastWorkspaceRoot = dependencies.workspaceRoot;
  retainWorkspaceIndexDiscoveredFileConnections(source, dependencies.discoveredFiles);

  if (filesToAnalyze.length === 0) {
    return buildWorkspaceIndexGraphFromRefreshState(
      source,
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

  for (const [filePath, analysis] of analysisResult.fileAnalysis) {
    source._lastFileAnalysis.set(filePath, analysis);
  }
  for (const [filePath, connections] of analysisResult.fileConnections) {
    source._lastFileConnections.set(filePath, connections);
  }

  dependencies.persistCache();
  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
}
