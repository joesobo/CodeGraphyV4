import type { IGraphData } from '../../../shared/graph/types';

const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

export type GraphViewAnalysisMode = 'analyze' | 'load';

interface GraphViewAnalyzerLike {
  initialize(): Promise<void>;
  hasIndex(): boolean;
  discoverGraph(
    filterPatterns?: string[],
    disabledSources?: Set<string>,
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
  ): Promise<IGraphData>;
  analyze(
    filterPatterns?: string[],
    disabledSources?: Set<string>,
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
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
  filterPatterns: string[];
  disabledSources: Set<string>;
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
  sendIndexProgress?(progress: { phase: string; current: number; total: number }): void;
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

  if (!state.analyzerInitialized) {
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
    if (handlers.isAnalysisStale(signal, requestId)) return;
  }

  handlers.computeMergedGroups();
  if (handlers.isAnalysisStale(signal, requestId)) return;
  handlers.sendGroupsUpdated();

  if (!handlers.hasWorkspace()) {
    publishEmptyGraph(handlers);
    return;
  }

  try {
    const shouldDiscover = state.mode === 'load' && !state.analyzer.hasIndex();
    if (!shouldDiscover) {
      handlers.sendIndexProgress?.({
        phase: 'Indexing Repo',
        current: 0,
        total: 1,
      });
    }
    const rawGraphData = shouldDiscover
      ? await state.analyzer.discoverGraph(
          state.filterPatterns,
          state.disabledSources,
          state.disabledPlugins,
          signal,
        )
      : await state.analyzer.analyze(
          state.filterPatterns,
          state.disabledSources,
          state.disabledPlugins,
          signal,
        );
    if (handlers.isAnalysisStale(signal, requestId)) return;

    handlers.setRawGraphData(rawGraphData);
    handlers.sendGraphIndexStatusUpdated(!shouldDiscover);
    handlers.updateViewContext();
    handlers.applyViewTransform();

    const graphData = handlers.getGraphData();
    if (!shouldDiscover) {
      handlers.sendIndexProgress?.({
        phase: 'Indexing Repo',
        current: 1,
        total: 1,
      });
    }
    handlers.sendGraphDataUpdated(graphData);
    handlers.sendDepthState();
    handlers.sendPluginStatuses();
    handlers.sendDecorations();
    handlers.sendContextMenuItems();
    handlers.sendPluginExporters?.();
    handlers.sendPluginToolbarActions?.();
    state.analyzer.registry.notifyPostAnalyze(graphData);
    handlers.markWorkspaceReady(graphData);
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
