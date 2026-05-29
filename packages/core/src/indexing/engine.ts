import { createEmptyWorkspaceAnalysisCache, type IWorkspaceAnalysisCache } from '../analysis/cache';
import type { IWorkspaceFileAnalysisResult } from '../analysis/fileAnalysis';
import { analyzeWorkspacePipelineFiles } from '../analysis/workspaceFiles';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile, IDiscoveryResult } from '../discovery/contracts';
import { FileDiscovery } from '../discovery/file/service';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import type { IGraphData } from '../graph/contracts';
import { saveWorkspaceAnalysisDatabaseCache } from '../graphCache/database/storage';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';
import { analyzeWorkspaceIndexFiles } from './analysis';
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

interface WorkspaceEngineState {
  cache: IWorkspaceAnalysisCache;
  directories: string[];
  discoveryResult?: IDiscoveryResult;
  fileAnalysis: Map<string, IFileAnalysisResult>;
  fileConnections: Map<string, IProjectedConnection[]>;
  graph: IGraphData;
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
  registry?: CorePluginRegistry;
  settings?: CodeGraphyWorkspaceSettings;
}

export interface CodeGraphyWorkspaceEngine {
  applyChangedFiles(
    filePaths: readonly string[],
  ): Promise<IndexCodeGraphyWorkspaceResult>;
  index(): Promise<IndexCodeGraphyWorkspaceResult>;
}

function createInitialState(): WorkspaceEngineState {
  return {
    cache: createEmptyWorkspaceAnalysisCache(),
    directories: [],
    fileAnalysis: new Map(),
    fileConnections: new Map(),
    graph: { nodes: [], edges: [] },
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

function invalidateWorkspaceIndexFiles(
  state: WorkspaceEngineState,
  workspaceRoot: string,
  filePaths: readonly string[],
): void {
  for (const filePath of filePaths) {
    const relativePath = filePath.startsWith(`${workspaceRoot}/`)
      ? filePath.slice(workspaceRoot.length + 1)
      : undefined;
    if (!relativePath) {
      continue;
    }

    delete state.cache.files[relativePath];
    state.fileAnalysis.delete(relativePath);
    state.fileConnections.delete(relativePath);
  }
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

export function createCodeGraphyWorkspaceEngine(
  options: IndexCodeGraphyWorkspaceOptions,
): CodeGraphyWorkspaceEngine {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const discovery = new FileDiscovery();
  const state = createInitialState();

  const buildGraph = (disabledPlugins: Set<string>): IGraphData => {
    if (!state.discoveryResult || !state.registry || !state.settings) {
      return { nodes: [], edges: [] };
    }

    state.graph = buildWorkspacePipelineGraphFromAnalysis({
      cacheFiles: state.cache.files,
      churnCounts: {},
      directoryPaths: state.directories,
      disabledPlugins,
      fileAnalysis: state.fileAnalysis,
      getPluginForFile: absolutePath => state.registry?.getPluginForFile(absolutePath),
      showOrphans: true,
      workspaceRoot,
    });
    return state.graph;
  };

  const persist = (): void => {
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
  };

  const index = async (): Promise<IndexCodeGraphyWorkspaceResult> => {
    state.cache = createEmptyWorkspaceAnalysisCache();
    state.settings = createEffectiveIndexSettings(workspaceRoot, options);
    const registryResult = await createWorkspaceIndexRegistry(options, state.settings, workspaceRoot);
    state.registry = registryResult.registry;
    state.loadedPackagePlugins = registryResult.loadedPackagePlugins;

    await state.registry.initializeAll(workspaceRoot);
    const disabledPlugins = new Set(options.disabledPlugins ?? []);
    state.discoveryResult = await discoverWorkspaceIndexFiles({
      disabledPlugins,
      discovery,
      options,
      registry: state.registry,
      settings: state.settings,
      workspaceRoot,
    });
    state.directories = state.discoveryResult.directories ?? [];

    const analysisResult = await analyzeWorkspaceIndexFiles({
      cache: state.cache,
      discovery,
      discoveryResult: state.discoveryResult,
      options,
      registry: state.registry,
      workspaceRoot,
    });
    updateStateFromAnalysis(state, analysisResult);
    const graph = buildGraph(disabledPlugins);
    state.registry.notifyPostAnalyze(graph);
    state.registry.notifyWorkspaceReady(graph);
    persist();
    options.logInfo?.(`[CodeGraphy] Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

    return createIndexResult({
      cache: state.cache,
      directories: state.directories,
      discoveryResult: state.discoveryResult,
      graph,
      workspaceRoot,
    });
  };

  const applyChangedFiles = async (
    filePaths: readonly string[],
  ): Promise<IndexCodeGraphyWorkspaceResult> => {
    if (!state.discoveryResult || !state.registry || !state.settings) {
      return index();
    }

    const disabledPlugins = new Set(options.disabledPlugins ?? []);
    state.discoveryResult = await discoverWorkspaceIndexFiles({
      disabledPlugins,
      discovery,
      options,
      registry: state.registry,
      settings: state.settings,
      workspaceRoot,
    });
    state.directories = state.discoveryResult.directories ?? [];

    const discoveredByRelativePath = mapDiscoveredWorkspaceIndexFilesByRelativePath(
      state.discoveryResult.files,
    );
    const changeSelection = selectDiscoveredWorkspaceIndexFileChanges(
      workspaceRoot,
      filePaths,
      discoveredByRelativePath,
    );

    if (changeSelection.unmatchedFilePaths.length > 0) {
      invalidateWorkspaceIndexFiles(state, workspaceRoot, changeSelection.unmatchedFilePaths);
      return index();
    }

    const changedAnalysisFiles = await readAnalysisFiles(discovery, changeSelection.files);
    const pluginChanges = await state.registry.notifyFilesChanged(
      changedAnalysisFiles,
      workspaceRoot,
    );

    if (pluginChanges.requiresFullRefresh) {
      return index();
    }

    const filesToAnalyze = mergeDiscoveredWorkspaceIndexFiles(
      changeSelection.files,
      pluginChanges.additionalFilePaths,
      discoveredByRelativePath,
    );
    invalidateWorkspaceIndexFiles(
      state,
      workspaceRoot,
      filesToAnalyze.map(file => file.absolutePath),
    );

    const analysisResult = await analyzeWorkspacePipelineFiles({
      analyzeFile: async (absolutePath, content, rootPath) =>
        state.registry?.analyzeFileResult(absolutePath, content, rootPath).then(result => result ?? ({
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

    for (const [filePath, analysis] of analysisResult.fileAnalysis) {
      state.fileAnalysis.set(filePath, analysis);
    }
    for (const [filePath, connections] of analysisResult.fileConnections) {
      state.fileConnections.set(filePath, connections);
    }

    const graph = buildGraph(disabledPlugins);
    persist();

    return createIndexResult({
      cache: state.cache,
      directories: state.directories,
      discoveryResult: state.discoveryResult,
      graph,
      workspaceRoot,
    });
  };

  return {
    applyChangedFiles,
    index,
  };
}
