import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceFileAnalysisResult } from '../analysis/fileAnalysis';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IDiscoveredFile } from '../discovery/contracts';
import type { IGraphData } from '../graph/contracts';
import { toRepoRelativeGraphPath } from '../graph/symbolPaths';
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

function workspaceIndexAnalysisCoversConnections(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  fileConnections: ReadonlyMap<string, IProjectedConnection[]>,
  workspaceRoot: string,
): boolean {
  if (fileConnections.size === 0) {
    return true;
  }

  const analysisFilePaths = new Set(
    [...fileAnalysis.keys()].map(filePath =>
      toRepoRelativeGraphPath(filePath, workspaceRoot),
    ),
  );

  for (const filePath of fileConnections.keys()) {
    if (!analysisFilePaths.has(toRepoRelativeGraphPath(filePath, workspaceRoot))) {
      return false;
    }
  }

  return true;
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
  if (workspaceIndexAnalysisCoversConnections(
    source._lastFileAnalysis,
    source._lastFileConnections,
    workspaceRoot,
  )) {
    source._lastGraphData = analysisGraphData;
    return analysisGraphData;
  }

  const graphData = mergeWorkspaceIndexGraphData(
    analysisGraphData,
    source._buildGraphData(source._lastFileConnections, workspaceRoot, disabledPlugins),
  );
  source._lastGraphData = graphData;
  return graphData;
}

function listOrEmpty<T>(value: readonly T[] | undefined): readonly T[] {
  return value ?? [];
}

function serializeWorkspaceIndexGraphAnalysis(analysis: IFileAnalysisResult): string {
  return JSON.stringify({
    edgeTypes: listOrEmpty(analysis.edgeTypes),
    filePath: analysis.filePath,
    nodeTypes: listOrEmpty(analysis.nodeTypes),
    nodes: listOrEmpty(analysis.nodes),
    relations: listOrEmpty(analysis.relations),
    symbols: listOrEmpty(analysis.symbols),
  });
}

function serializeWorkspaceIndexConnections(
  connections: IProjectedConnection[] | undefined,
): string {
  return JSON.stringify(connections ?? []);
}

interface WorkspaceIndexRefreshGraphSnapshot {
  fileAnalysisByPath: Map<string, string>;
  fileConnectionsByPath: Map<string, string>;
}

function canCaptureWorkspaceIndexRefreshGraphSnapshot(source: WorkspaceIndexRefreshSource): boolean {
  return Boolean(source._patchGraphDataNodeMetrics) && !isWorkspaceIndexGraphDataEmpty(source._lastGraphData);
}

function isWorkspaceIndexGraphDataEmpty(graphData: IGraphData): boolean {
  return graphData.nodes.length === 0 && graphData.edges.length === 0;
}

function captureWorkspaceIndexRefreshGraphSnapshot(
  source: WorkspaceIndexRefreshSource,
  files: readonly IDiscoveredFile[],
): WorkspaceIndexRefreshGraphSnapshot | undefined {
  if (!canCaptureWorkspaceIndexRefreshGraphSnapshot(source)) {
    return undefined;
  }

  const snapshot: WorkspaceIndexRefreshGraphSnapshot = {
    fileAnalysisByPath: new Map(),
    fileConnectionsByPath: new Map(),
  };

  for (const file of files) {
    if (!captureWorkspaceIndexRefreshSnapshotFile(source, snapshot, file.relativePath)) {
      return undefined;
    }
  }

  return snapshot;
}

function captureWorkspaceIndexRefreshSnapshotFile(
  source: WorkspaceIndexRefreshSource,
  snapshot: WorkspaceIndexRefreshGraphSnapshot,
  relativePath: string,
): boolean {
  const analysis = source._lastFileAnalysis.get(relativePath);
  if (!analysis) {
    return false;
  }

  snapshot.fileAnalysisByPath.set(relativePath, serializeWorkspaceIndexGraphAnalysis(analysis));
  snapshot.fileConnectionsByPath.set(
    relativePath,
    serializeWorkspaceIndexConnections(source._lastFileConnections.get(relativePath)),
  );
  return true;
}

function workspaceIndexRefreshSnapshotMatchesFile(
  snapshot: WorkspaceIndexRefreshGraphSnapshot,
  analysisResult: IWorkspaceFileAnalysisResult,
  relativePath: string,
): boolean {
  const analysis = analysisResult.fileAnalysis.get(relativePath);
  if (!analysis) {
    return false;
  }

  return snapshot.fileAnalysisByPath.get(relativePath) === serializeWorkspaceIndexGraphAnalysis(analysis)
    && snapshot.fileConnectionsByPath.get(relativePath)
      === serializeWorkspaceIndexConnections(analysisResult.fileConnections.get(relativePath));
}

function canPatchWorkspaceIndexRefreshGraphData(
  snapshot: WorkspaceIndexRefreshGraphSnapshot | undefined,
  analysisResult: IWorkspaceFileAnalysisResult,
  files: readonly IDiscoveredFile[],
): boolean {
  if (!snapshot) {
    return false;
  }

  return files.every(file =>
    workspaceIndexRefreshSnapshotMatchesFile(snapshot, analysisResult, file.relativePath),
  );
}

function persistMetricOnlyIndexMetadata(
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<void> | void {
  const persistence = dependencies.persistIndexMetadata();
  if (dependencies.deferMetricOnlyIndexMetadata) {
    void persistence.catch(error => {
      dependencies.onDeferredIndexMetadataError?.(error);
    });
    return;
  }

  return persistence;
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
    undefined,
    dependencies.disabledPlugins,
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
      dependencies.disabledPlugins,
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
    return analyzeWorkspaceIndexFromRefresh(source, dependencies);
  }

  const changedAnalysisFiles = await source._readAnalysisFiles(changedFiles);
  const incrementalLifecycle = await dependencies.notifyFilesChanged(
    changedAnalysisFiles,
    dependencies.workspaceRoot,
    undefined,
    dependencies.disabledPlugins,
  );

  if (incrementalLifecycle.requiresFullRefresh) {
    return analyzeWorkspaceIndexFromRefresh(source, dependencies);
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

  const graphSnapshot = captureWorkspaceIndexRefreshGraphSnapshot(source, filesToAnalyze);
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
    undefined,
    dependencies.disabledPlugins,
  );

  applyWorkspaceIndexAnalysisResult(source, analysisResult);

  dependencies.persistCache();
  if (
    canPatchWorkspaceIndexRefreshGraphData(graphSnapshot, analysisResult, filesToAnalyze)
    && source._patchGraphDataNodeMetrics
  ) {
    const graphData = source._patchGraphDataNodeMetrics(
      source._lastGraphData,
      filesToAnalyze.map(file => file.relativePath),
    );
    source._lastGraphData = graphData;
    await persistMetricOnlyIndexMetadata(dependencies);
    return graphData;
  }

  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
}
