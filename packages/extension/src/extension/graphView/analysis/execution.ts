import type { IGraphData } from '../../../shared/graph/types';

const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

interface GraphViewAnalyzerLike {
  initialize(): Promise<void>;
  analyze(
    filterPatterns?: string[],
    disabledRules?: Set<string>,
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
  filterPatterns: string[];
  disabledRules: Set<string>;
  disabledPlugins: Set<string>;
}

export interface GraphViewAnalysisExecutionHandlers {
  isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  hasWorkspace(): boolean;
  setRawGraphData(graphData: IGraphData): void;
  setGraphData(graphData: IGraphData): void;
  getGraphData(): IGraphData;
  sendGraphDataUpdated(graphData: IGraphData): void;
  sendAvailableViews(): void;
  computeMergedGroups(): void;
  sendGroupsUpdated(): void;
  updateViewContext(): void;
  applyViewTransform(): void;
  sendPluginStatuses(): void;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  markWorkspaceReady(graphData: IGraphData): void;
  isAbortError(error: unknown): boolean;
  logError(message: string, error: unknown): void;
}

function publishEmptyGraph(handlers: GraphViewAnalysisExecutionHandlers): IGraphData {
  handlers.setRawGraphData(EMPTY_GRAPH_DATA);
  handlers.setGraphData(EMPTY_GRAPH_DATA);
  handlers.sendGraphDataUpdated(EMPTY_GRAPH_DATA);
  handlers.sendAvailableViews();
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
    const rawGraphData = await state.analyzer.analyze(
      state.filterPatterns,
      state.disabledRules,
      state.disabledPlugins,
      signal,
    );
    if (handlers.isAnalysisStale(signal, requestId)) return;

    handlers.setRawGraphData(rawGraphData);
    handlers.updateViewContext();
    handlers.applyViewTransform();

    const graphData = handlers.getGraphData();
    handlers.sendGraphDataUpdated(graphData);
    handlers.sendAvailableViews();
    handlers.sendPluginStatuses();
    handlers.sendDecorations();
    handlers.sendContextMenuItems();
    state.analyzer.registry.notifyPostAnalyze(graphData);
    handlers.markWorkspaceReady(graphData);
  } catch (error) {
    if (handlers.isAbortError(error) || handlers.isAnalysisStale(signal, requestId)) {
      return;
    }

    handlers.logError('[CodeGraphy] Analysis failed:', error);
    const graphData = publishEmptyGraph(handlers);
    handlers.sendPluginStatuses();
    handlers.markWorkspaceReady(graphData);
  }
}
