import { createEmptyWorkspaceAnalysisCache, type IWorkspaceAnalysisCache } from '../analysis/cache';
import type { IWorkspaceFileAnalysisResult } from '../analysis/fileAnalysis';
import { analyzeWorkspacePipelineFiles } from '../analysis/workspaceFiles';
import type { IDiscoveredFile, IDiscoveryResult } from '../discovery/contracts';
import { FileDiscovery } from '../discovery/file/service';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import type { IGraphData } from '../graph/contracts';
import {
  patchWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCache,
} from '../graphCache/database/storage';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';
import { analyzeWorkspaceIndexFiles } from './analysis';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import {
  mapDiscoveredWorkspaceIndexFilesByRelativePath,
  mergeDiscoveredWorkspaceIndexFiles,
  selectDiscoveredWorkspaceIndexFileChanges,
} from './changedFiles';
import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import { discoverWorkspaceIndexFiles } from './discovery';
import { getFileStat } from './fileStat';
import { persistWorkspaceIndexMetadata } from './metadata';
import { createWorkspaceIndexRegistry } from './registry';
import { createEffectiveIndexSettings } from './settings';
import type { CorePluginRegistry } from '../plugins/registry';
import type { LoadedCodeGraphyWorkspacePluginPackage } from '../plugins/packageRuntime';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';
import {
  createWorkspaceIndexEngineState,
  invalidateWorkspaceIndexEngineFiles,
  type WorkspaceIndexEngineState,
} from './state';

interface WorkspaceEngineState extends WorkspaceIndexEngineState {
  discoveryResult?: IDiscoveryResult;
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
  registry?: CorePluginRegistry;
  settings?: CodeGraphyWorkspaceSettings;
}

interface WorkspaceEngineRuntime {
  discovery: FileDiscovery;
  options: IndexCodeGraphyWorkspaceOptions;
  state: WorkspaceEngineState;
  workspaceRoot: string;
}

export interface CodeGraphyWorkspaceEngine {
  applyChangedFiles(
    filePaths: readonly string[],
  ): Promise<IndexCodeGraphyWorkspaceResult>;
  index(): Promise<IndexCodeGraphyWorkspaceResult>;
}

function createInitialState(): WorkspaceEngineState {
  return {
    ...createWorkspaceIndexEngineState(),
    loadedPackagePlugins: [],
  };
}

function createIndexResult(input: {
  cache: IWorkspaceAnalysisCache;
  directories: string[];
  discoveryResult: IDiscoveryResult;
  graph: IGraphData;
  workspaceRoot: string;
}): IndexCodeGraphyWorkspaceResult {
  return {
    workspaceRoot: input.workspaceRoot,
    graphCachePath: getGraphCachePath(input.workspaceRoot),
    graph: input.graph,
    cache: input.cache,
    files: input.discoveryResult.files,
    directories: input.directories,
    gitIgnoredPaths: input.discoveryResult.gitIgnoredPaths ?? [],
    limitReached: input.discoveryResult.limitReached,
    totalFound: input.discoveryResult.totalFound ?? input.discoveryResult.files.length,
  };
}

function updateStateFromAnalysis(
  state: WorkspaceEngineState,
  analysisResult: IWorkspaceFileAnalysisResult,
): void {
  state.fileAnalysis = analysisResult.fileAnalysis;
  state.fileConnections = analysisResult.fileConnections;
}

async function readAnalysisFiles(
  discovery: FileDiscovery,
  files: readonly IDiscoveredFile[],
): Promise<Array<{ absolutePath: string; relativePath: string; content: string }>> {
  return Promise.all(
    files.map(async (file) => ({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      content: await discovery.readContent(file),
    })),
  );
}

function buildWorkspaceEngineGraph(
  runtime: WorkspaceEngineRuntime,
  disabledPlugins: Set<string>,
): IGraphData {
  const { state, workspaceRoot } = runtime;
  if (!state.discoveryResult || !state.registry || !state.settings) {
    return { nodes: [], edges: [] };
  }

  state.graph = buildWorkspacePipelineGraphFromAnalysis({
    cacheFiles: state.cache.files,
    churnCounts: {},
    directoryPaths: state.discoveredDirectories,
    gitIgnoredPaths: state.discoveryResult.gitIgnoredPaths ?? [],
    disabledPlugins,
    fileAnalysis: state.fileAnalysis,
    getPluginForFile: absolutePath => state.registry?.getPluginForFile(absolutePath),
    showOrphans: true,
    workspaceRoot,
  });
  return state.graph;
}

function createWorkspaceEngineDisabledPlugins(runtime: WorkspaceEngineRuntime): Set<string> {
  return runtime.state.settings
    ? createDisabledPluginSet(runtime.state.settings, runtime.options.disabledPlugins)
    : new Set(runtime.options.disabledPlugins ?? []);
}

function persistWorkspaceEngine(runtime: WorkspaceEngineRuntime): void {
  const { state, workspaceRoot } = runtime;
  if (!state.registry || !state.settings) {
    return;
  }

  saveWorkspaceAnalysisDatabaseCache(workspaceRoot, state.cache);
  persistWorkspaceIndexMetadata({
    loadedPackagePlugins: state.loadedPackagePlugins,
    registry: state.registry,
    settings: state.settings,
    workspaceRoot,
  });
}

function patchWorkspaceEngineCache(
  runtime: WorkspaceEngineRuntime,
  patch: {
    deleteFilePaths: readonly string[];
    upsertFilePaths: readonly string[];
  },
): void {
  const { state, workspaceRoot } = runtime;
  if (!state.registry || !state.settings) {
    return;
  }

  const upsertFiles: IWorkspaceAnalysisCache['files'] = {};
  for (const filePath of patch.upsertFilePaths) {
    const entry = state.cache.files[filePath];
    if (entry) {
      upsertFiles[filePath] = entry;
    }
  }

  patchWorkspaceAnalysisDatabaseCache(workspaceRoot, {
    deleteFilePaths: patch.deleteFilePaths,
    upsertFiles,
  });
  persistWorkspaceIndexMetadata({
    loadedPackagePlugins: state.loadedPackagePlugins,
    registry: state.registry,
    settings: state.settings,
    workspaceRoot,
  });
}

async function discoverWorkspaceEngineFiles(
  runtime: WorkspaceEngineRuntime,
  disabledPlugins: Set<string>,
): Promise<void> {
  const { discovery, options, state, workspaceRoot } = runtime;
  if (!state.registry || !state.settings) {
    return;
  }

  state.discoveryResult = await discoverWorkspaceIndexFiles({
    disabledPlugins,
    discovery,
    options,
    registry: state.registry,
    settings: state.settings,
    workspaceRoot,
  });
  state.discoveredDirectories = state.discoveryResult.directories ?? [];
  state.discoveredFiles = state.discoveryResult.files;
}

async function initializeWorkspaceEngine(runtime: WorkspaceEngineRuntime): Promise<void> {
  const { options, state, workspaceRoot } = runtime;
  state.cache = createEmptyWorkspaceAnalysisCache();
  state.settings = createEffectiveIndexSettings(workspaceRoot, options);
  const disabledPlugins = createDisabledPluginSet(state.settings, options.disabledPlugins);
  const registryResult = await createWorkspaceIndexRegistry(options, state.settings, workspaceRoot, disabledPlugins);
  state.registry = registryResult.registry;
  state.loadedPackagePlugins = registryResult.loadedPackagePlugins;
  state.workspaceRoot = workspaceRoot;
  await state.registry.initializeAll(workspaceRoot);
}

function createWorkspaceEngineIndexResult(
  runtime: WorkspaceEngineRuntime,
  graph: IGraphData,
): IndexCodeGraphyWorkspaceResult {
  const { state, workspaceRoot } = runtime;
  return createIndexResult({
    cache: state.cache,
    directories: state.discoveredDirectories,
    discoveryResult: state.discoveryResult!,
    graph,
    workspaceRoot,
  });
}

async function indexWorkspaceEngine(
  runtime: WorkspaceEngineRuntime,
): Promise<IndexCodeGraphyWorkspaceResult> {
  const { discovery, options, state, workspaceRoot } = runtime;
  await initializeWorkspaceEngine(runtime);

  const disabledPlugins = createWorkspaceEngineDisabledPlugins(runtime);
  await discoverWorkspaceEngineFiles(runtime, disabledPlugins);

  const analysisResult = await analyzeWorkspaceIndexFiles({
    cache: state.cache,
    discovery,
    discoveryResult: state.discoveryResult!,
    disabledPlugins,
    options,
    registry: state.registry!,
    workspaceRoot,
  });
  updateStateFromAnalysis(state, analysisResult);
  const graph = buildWorkspaceEngineGraph(runtime, disabledPlugins);
  state.registry!.notifyPostAnalyze(graph, disabledPlugins);
  state.registry!.notifyWorkspaceReady(graph, disabledPlugins);
  persistWorkspaceEngine(runtime);
  options.logInfo?.(`[CodeGraphy] Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  return createWorkspaceEngineIndexResult(runtime, graph);
}

function hasWorkspaceEngineIndexState(state: WorkspaceEngineState): boolean {
  return Boolean(state.discoveryResult && state.registry && state.settings);
}

async function analyzeWorkspaceEngineChangedFiles(
  runtime: WorkspaceEngineRuntime,
  filesToAnalyze: IDiscoveredFile[],
  disabledPlugins: ReadonlySet<string>,
): Promise<IWorkspaceFileAnalysisResult> {
  const { discovery, options, state, workspaceRoot } = runtime;
  return analyzeWorkspacePipelineFiles({
    analyzeFile: async (absolutePath, content, rootPath) =>
      state.registry?.analyzeFileResult(
        absolutePath,
        content,
        rootPath,
        undefined,
        { disabledPlugins },
      ).then(result => result ?? ({
        filePath: absolutePath,
        relations: [],
      })) ?? { filePath: absolutePath, relations: [] },
    cache: state.cache,
    files: filesToAnalyze,
    getFileStat,
    logInfo: options.logInfo ?? (() => undefined),
    onProgress: progress => options.onProgress?.({
      phase: 'Applying Changes',
      current: progress.current,
      total: progress.total,
    }),
    readContent: file => discovery.readContent(file),
    signal: options.signal,
    workspaceRoot,
  });
}

function applyWorkspaceEngineAnalysisResult(
  state: WorkspaceEngineState,
  analysisResult: IWorkspaceFileAnalysisResult,
): void {
  for (const [filePath, analysis] of analysisResult.fileAnalysis) {
    state.fileAnalysis.set(filePath, analysis);
  }
  for (const [filePath, connections] of analysisResult.fileConnections) {
    state.fileConnections.set(filePath, connections);
  }
}

export function createCodeGraphyWorkspaceEngine(
  options: IndexCodeGraphyWorkspaceOptions,
): CodeGraphyWorkspaceEngine {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const discovery = new FileDiscovery();
  const state = createInitialState();
  const runtime: WorkspaceEngineRuntime = {
    discovery,
    options,
    state,
    workspaceRoot,
  };

  const index = async (): Promise<IndexCodeGraphyWorkspaceResult> => {
    return indexWorkspaceEngine(runtime);
  };

  const applyChangedFiles = async (
    filePaths: readonly string[],
  ): Promise<IndexCodeGraphyWorkspaceResult> => {
    if (!hasWorkspaceEngineIndexState(state)) {
      return index();
    }

    const disabledPlugins = createWorkspaceEngineDisabledPlugins(runtime);
    await discoverWorkspaceEngineFiles(runtime, disabledPlugins);
    const registry = state.registry!;

    const discoveredByRelativePath = mapDiscoveredWorkspaceIndexFilesByRelativePath(
      state.discoveryResult!.files,
    );
    const changeSelection = selectDiscoveredWorkspaceIndexFileChanges(
      workspaceRoot,
      filePaths,
      discoveredByRelativePath,
    );

    if (changeSelection.unmatchedFilePaths.length > 0) {
      invalidateWorkspaceIndexEngineFiles(state, workspaceRoot, changeSelection.unmatchedFilePaths);
      return index();
    }

    const changedAnalysisFiles = await readAnalysisFiles(discovery, changeSelection.files);
    const pluginChanges = await registry.notifyFilesChanged(
      changedAnalysisFiles,
      workspaceRoot,
      undefined,
      disabledPlugins,
    );

    if (pluginChanges.requiresFullRefresh) {
      return index();
    }

    const filesToAnalyze = mergeDiscoveredWorkspaceIndexFiles(
      changeSelection.files,
      pluginChanges.additionalFilePaths,
      discoveredByRelativePath,
    );
    invalidateWorkspaceIndexEngineFiles(
      state,
      workspaceRoot,
      filesToAnalyze.map(file => file.absolutePath),
    );

    const analysisResult = await analyzeWorkspaceEngineChangedFiles(runtime, filesToAnalyze, disabledPlugins);
    applyWorkspaceEngineAnalysisResult(state, analysisResult);

    const graph = buildWorkspaceEngineGraph(runtime, disabledPlugins);
    registry.notifyPostAnalyze(graph, disabledPlugins);
    patchWorkspaceEngineCache(runtime, {
      deleteFilePaths: [],
      upsertFilePaths: filesToAnalyze.map(file => file.relativePath),
    });

    return createWorkspaceEngineIndexResult(runtime, graph);
  };

  return {
    applyChangedFiles,
    index,
  };
}
