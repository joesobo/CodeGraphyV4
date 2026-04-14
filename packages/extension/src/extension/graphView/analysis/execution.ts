import type { IGraphData } from '../../../shared/graph/types';

const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

export type GraphViewAnalysisMode = 'analyze' | 'load' | 'index' | 'refresh' | 'incremental';
export type GraphViewIndexingProgress = { phase: string; current: number; total: number };

interface GraphViewAnalyzerLike {
  initialize(): Promise<void>;
  hasIndex(): boolean;
  discoverGraph(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
  ): Promise<IGraphData>;
  analyze(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewIndexingProgress) => void,
  ): Promise<IGraphData>;
  refreshIndex?(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewIndexingProgress) => void,
  ): Promise<IGraphData>;
  refreshChangedFiles?(
    filePaths: readonly string[],
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewIndexingProgress) => void,
  ): Promise<IGraphData>;
  registry: {
    notifyPostAnalyze(graph: IGraphData): void;
  };
}

export interface GraphViewAnalysisExecutionState {
  analyzer: GraphViewAnalyzerLike | undefined;
  analyzerInitialized: boolean;
  analyzerInitPromise: Promise<void> | undefined;
  installedPluginActivationPromise?: Promise<void>;
  mode: GraphViewAnalysisMode;
  changedFilePaths?: readonly string[];
  filterPatterns: string[];
  disabledPlugins: Set<string>;
}

export interface GraphViewAnalysisExecutionHandlers {
  isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  hasWorkspace(): boolean;
  setRawGraphData(graphData: IGraphData): void;
  setGraphData(graphData: IGraphData): void;
  getGraphData(): IGraphData;
  sendGraphDataUpdated(graphData: IGraphData): void;
  sendDepthState(): void;
  computeMergedGroups(): void;
  sendGroupsUpdated(): void;
  updateViewContext(): void;
  applyViewTransform(): void;
  sendPluginStatuses(): void;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  sendGraphIndexStatusUpdated(hasIndex: boolean): void;
  sendIndexProgress?(progress: GraphViewIndexingProgress): void;
  sendPluginExporters?(): void;
  sendPluginToolbarActions?(): void;
  markWorkspaceReady(graphData: IGraphData): void;
  isAbortError(error: unknown): boolean;
  logError(message: string, error: unknown): void;
}

function publishEmptyGraph(
  handlers: GraphViewAnalysisExecutionHandlers,
  hasIndex: boolean = false,
): IGraphData {
  handlers.setRawGraphData(EMPTY_GRAPH_DATA);
  handlers.setGraphData(EMPTY_GRAPH_DATA);
  handlers.sendGraphDataUpdated(EMPTY_GRAPH_DATA);
  handlers.sendGraphIndexStatusUpdated(hasIndex);
  handlers.sendDepthState();
  return EMPTY_GRAPH_DATA;
}

function createProgressForwarder(
  mode: GraphViewAnalysisMode,
  handlers: GraphViewAnalysisExecutionHandlers,
): (progress: GraphViewIndexingProgress) => void {
  const phase = mode === 'refresh'
    ? 'Refreshing Index'
    : mode === 'incremental'
      ? 'Applying Changes'
      : mode === 'load'
        ? 'Loading Graph'
      : 'Indexing Repo';

  return (progress) => {
    handlers.sendIndexProgress?.({
      ...progress,
      phase,
    });
  };
}

function sendInitialProgressState(
  mode: GraphViewAnalysisMode,
  handlers: GraphViewAnalysisExecutionHandlers,
): void {
  if (mode !== 'index' && mode !== 'refresh' && mode !== 'incremental') {
    return;
  }

  createProgressForwarder(mode, handlers)({
    phase: '',
    current: 0,
    total: 1,
  });
}

function publishAnalyzedGraph(
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
  hasIndex: boolean,
): void {
  handlers.setRawGraphData(rawGraphData);
  handlers.sendGraphIndexStatusUpdated(hasIndex);
  handlers.updateViewContext();
  handlers.applyViewTransform();

  const graphData = handlers.getGraphData();
  handlers.sendGraphDataUpdated(graphData);
  handlers.sendDepthState();
  handlers.sendPluginStatuses();
  handlers.sendDecorations();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  state.analyzer?.registry.notifyPostAnalyze(graphData);
  handlers.markWorkspaceReady(graphData);
}

async function ensureAnalyzerInitialized(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<boolean> {
  if (state.analyzerInitialized) {
    return true;
  }

  if (!state.analyzer) {
    return false;
  }

  if (!state.analyzerInitPromise) {
    state.analyzerInitPromise = state.analyzer
      .initialize()
      .then(() => {
        state.analyzerInitialized = true;
      })
      .finally(() => {
        state.analyzerInitPromise = undefined;
      });
  }

  await state.analyzerInitPromise;
  return !handlers.isAnalysisStale(signal, requestId);
}

async function loadRawGraphData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<{ rawGraphData: IGraphData; shouldDiscover: boolean }> {
  if (!state.analyzer) {
    return { rawGraphData: EMPTY_GRAPH_DATA, shouldDiscover: false };
  }

  const shouldDiscover = state.mode === 'load' && !state.analyzer.hasIndex();
  const forwardProgress = createProgressForwarder(state.mode, handlers);

  if (!shouldDiscover) {
    sendInitialProgressState(state.mode, handlers);
  }

  if (shouldDiscover) {
    return {
      rawGraphData: await state.analyzer.discoverGraph(
        state.filterPatterns,
        state.disabledPlugins,
        signal,
      ),
      shouldDiscover,
    };
  }

  if (state.mode === 'refresh') {
    return {
      rawGraphData: await (state.analyzer.refreshIndex ?? state.analyzer.analyze)(
        state.filterPatterns,
        state.disabledPlugins,
        signal,
        forwardProgress,
      ),
      shouldDiscover,
    };
  }

  if (state.mode === 'incremental') {
    return {
      rawGraphData: state.analyzer.refreshChangedFiles
        ? await state.analyzer.refreshChangedFiles(
            state.changedFilePaths ?? [],
            state.filterPatterns,
            state.disabledPlugins,
            signal,
            forwardProgress,
          )
        : await state.analyzer.analyze(
            state.filterPatterns,
            state.disabledPlugins,
            signal,
            forwardProgress,
          ),
      shouldDiscover,
    };
  }

  return {
    rawGraphData: await state.analyzer.analyze(
      state.filterPatterns,
      state.disabledPlugins,
      signal,
      forwardProgress,
    ),
    shouldDiscover,
  };
}

export async function executeGraphViewAnalysis(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<void> {
  if (handlers.isAnalysisStale(signal, requestId)) return;

  if (!state.analyzer) {
    publishEmptyGraph(handlers);
    return;
  }

  await (state.installedPluginActivationPromise ?? Promise.resolve());
  if (handlers.isAnalysisStale(signal, requestId)) return;

  if (!(await ensureAnalyzerInitialized(signal, requestId, state, handlers))) {
    return;
  }

  handlers.computeMergedGroups();
  if (handlers.isAnalysisStale(signal, requestId)) return;
  handlers.sendGroupsUpdated();

  if (!handlers.hasWorkspace()) {
    publishEmptyGraph(handlers);
    return;
  }

  try {
    const { rawGraphData, shouldDiscover } = await loadRawGraphData(signal, state, handlers);
    if (handlers.isAnalysisStale(signal, requestId)) return;

    publishAnalyzedGraph(state, handlers, rawGraphData, !shouldDiscover);
  } catch (error) {
    if (handlers.isAbortError(error) || handlers.isAnalysisStale(signal, requestId)) {
      return;
    }

    handlers.logError('[CodeGraphy] Analysis failed:', error);
    const graphData = publishEmptyGraph(handlers);
    handlers.sendPluginStatuses();
    handlers.sendPluginExporters?.();
    handlers.sendPluginToolbarActions?.();
    handlers.markWorkspaceReady(graphData);
  }
}
