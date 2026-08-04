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
} from './refresh';
import {
  refreshGraphViewChangedFiles,
} from './incremental';
import {
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
  );
}

async function loadRefreshedGraphViewRawData(context: GraphViewRawDataLoadContext): Promise<IGraphData> {
  return refreshGraphViewRawData(context.signal, context.state, context.forwardProgress);
}

const GRAPH_VIEW_RAW_DATA_LOADERS: Record<GraphViewRawDataRoute, (
  context: GraphViewRawDataLoadContext,
) => Promise<IGraphData>> = {
  cached: loadCachedGraphViewRawDataOnly,
  empty: async () => EMPTY_GRAPH_DATA,
  incremental: context => refreshGraphViewChangedFiles(
    context.signal,
    context.state,
    context.forwardProgress,
  ),
  refresh: loadRefreshedGraphViewRawData,
};

export async function loadGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<IGraphData> {
  const analyzer = state.analyzer;
  if (!analyzer) {
    return EMPTY_GRAPH_DATA;
  }

  const { decision, indexFreshness } = selectGraphViewRawDataLoadDecisionForState(state, analyzer);
  const diagnosticIndexFreshness = indexFreshness ?? 'skipped';
  handlers.emitDiagnostic?.({
    area: 'extension.analysis',
    event: 'load-decision',
    context: {
        mode: state.mode,
        route: decision.route,
        indexFreshness: diagnosticIndexFreshness,
        canReplayCache: typeof analyzer.loadCachedGraph === 'function',
      },
  });
  const forwardProgress = createGraphViewAnalysisProgressForwarder(state.mode, handlers);

  sendInitialGraphViewAnalysisProgress(state.mode, handlers);

  const rawGraphData = await GRAPH_VIEW_RAW_DATA_LOADERS[decision.route]({
    analyzer,
    forwardProgress,
    indexFreshness,
    signal,
    state,
  });
  return rawGraphData;
}
