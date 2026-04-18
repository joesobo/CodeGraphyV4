import type { IGraphData } from '../../../shared/graph/contracts';
import { publishAnalysisFailure } from './execution/publish';
import { prepareGraphViewAnalysis } from './execution/prepare';
import { runGraphViewAnalysis } from './execution/run';

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

export async function executeGraphViewAnalysis(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<void> {
  if (!(await prepareGraphViewAnalysis(signal, requestId, state, handlers))) {
    return;
  }

  try {
    await runGraphViewAnalysis(signal, requestId, state, handlers);
  } catch (error) {
    if (handlers.isAbortError(error) || handlers.isAnalysisStale(signal, requestId)) {
      return;
    }

    handlers.logError('[CodeGraphy] Analysis failed:', error);
    publishAnalysisFailure(handlers);
  }
}
