import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import {
  createGraphViewAnalysisProgressForwarder,
  sendInitialGraphViewAnalysisProgress,
} from './progress';
import { EMPTY_GRAPH_DATA } from './publish';
import {
  refreshGraphViewRawData,
  refreshIncrementalGraphViewRawData,
} from './refresh';
import {
  analyzeGraphViewRawData,
  loadCachedGraphViewRawData,
} from './load/analyzerData';
import {
  selectGraphViewRawDataLoadDecisionForState,
  type GraphViewRawDataLoadContext,
  type GraphViewRawDataRoute,
} from './load/context';

async function loadCachedGraphViewRawDataOnly(
  context: GraphViewRawDataLoadContext,
): Promise<IGraphData> {
  return loadCachedGraphViewRawData(
    context.signal,
    context.state,
    context.analyzer,
    { warmAnalysis: false },
  );
}

async function loadRefreshedGraphViewRawData(context: GraphViewRawDataLoadContext): Promise<IGraphData> {
  return refreshGraphViewRawData(context.signal, context.state, context.forwardProgress);
}

async function loadIncrementalGraphViewRawData(context: GraphViewRawDataLoadContext): Promise<IGraphData> {
  return refreshIncrementalGraphViewRawData(context.signal, context.state, context.forwardProgress);
}

async function loadAnalyzedGraphViewRawData(context: GraphViewRawDataLoadContext): Promise<IGraphData> {
  return analyzeGraphViewRawData(
    context.signal,
    context.state,
    context.analyzer,
    context.forwardProgress,
  );
}

const GRAPH_VIEW_RAW_DATA_LOADERS: Record<GraphViewRawDataRoute, (
  context: GraphViewRawDataLoadContext,
) => Promise<IGraphData>> = {
  analyze: loadAnalyzedGraphViewRawData,
  cached: loadCachedGraphViewRawDataOnly,
  empty: async () => EMPTY_GRAPH_DATA,
  incremental: loadIncrementalGraphViewRawData,
  refresh: loadRefreshedGraphViewRawData,
};

export async function loadGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<{ rawGraphData: IGraphData; shouldDiscover: boolean }> {
  const analyzer = state.analyzer;
  if (!analyzer) {
    return { rawGraphData: EMPTY_GRAPH_DATA, shouldDiscover: false };
  }

  const { decision, indexFreshness } = selectGraphViewRawDataLoadDecisionForState(state, analyzer);
  const diagnosticIndexFreshness = indexFreshness ?? 'skipped';
  handlers.emitDiagnostic?.({
    area: 'extension.analysis',
    event: 'load-decision',
    context: {
        mode: state.mode,
        route: decision.route,
        shouldDiscover: decision.shouldDiscover,
        indexFreshness: diagnosticIndexFreshness,
        canReplayCache: typeof analyzer.loadCachedGraph === 'function',
      },
  });
  const forwardProgress = createGraphViewAnalysisProgressForwarder(state.mode, handlers);

  if (!decision.shouldDiscover) {
    sendInitialGraphViewAnalysisProgress(state.mode, handlers);
  }

  const rawGraphData = await GRAPH_VIEW_RAW_DATA_LOADERS[decision.route]({
    analyzer,
    forwardProgress,
    indexFreshness,
    signal,
    state,
  });
  return {
    rawGraphData,
    shouldDiscover: decision.shouldDiscover,
  };
}
