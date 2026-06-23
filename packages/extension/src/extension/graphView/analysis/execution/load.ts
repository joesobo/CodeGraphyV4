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
  discoverGraphViewRawData,
  loadCachedGraphViewRawData,
} from './load/analyzerData';
import { getGraphIndexFreshness } from './load/freshness';
import { selectGraphViewRawDataLoadDecision } from './load/routing';
import type { GraphViewRawDataLoadDecision } from './load/routing';
import type { CodeGraphyIndexFreshness } from '../../../repoSettings/freshness';

type GraphViewRawDataRoute = GraphViewRawDataLoadDecision['route'];
type GraphViewAnalyzer = NonNullable<GraphViewAnalysisExecutionState['analyzer']>;

interface GraphViewRawDataLoadContext {
  analyzer: GraphViewAnalyzer;
  forwardProgress: ReturnType<typeof createGraphViewAnalysisProgressForwarder>;
  indexFreshness: CodeGraphyIndexFreshness | undefined;
  signal: AbortSignal;
  state: GraphViewAnalysisExecutionState;
}

function hasReplayableGraphData(graphData: IGraphData): boolean {
  return graphData.nodes.length > 0 || graphData.edges.length > 0;
}

function selectGraphViewRawDataLoadDecisionForState(
  state: GraphViewAnalysisExecutionState,
  analyzer: NonNullable<GraphViewAnalysisExecutionState['analyzer']>,
): {
  decision: GraphViewRawDataLoadDecision;
  indexFreshness: CodeGraphyIndexFreshness | undefined;
} {
  if (state.mode === 'incremental') {
    return {
      decision: { route: 'incremental', shouldDiscover: false },
      indexFreshness: undefined,
    };
  }

  const indexFreshness = getGraphIndexFreshness(analyzer);
  return {
    decision: selectGraphViewRawDataLoadDecision(
      state.mode,
      indexFreshness,
      typeof analyzer.loadCachedGraph === 'function',
    ),
    indexFreshness,
  };
}

async function loadDiscoveredGraphViewRawData(context: GraphViewRawDataLoadContext): Promise<IGraphData> {
  return discoverGraphViewRawData(context.signal, context.state, context.analyzer);
}

async function loadCachedOrRefreshedGraphViewRawData(context: GraphViewRawDataLoadContext): Promise<IGraphData> {
  const cachedGraphData = await loadCachedGraphViewRawData(context.signal, context.state, context.analyzer, {
    includeCurrentGitignoreMetadata: context.indexFreshness !== 'stale',
    ...(context.indexFreshness === 'stale' ? { warmAnalysis: false } : {}),
  });

  return hasReplayableGraphData(cachedGraphData)
    ? cachedGraphData
    : refreshGraphViewRawData(context.signal, context.state, context.forwardProgress);
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
  cached: loadCachedOrRefreshedGraphViewRawData,
  discover: loadDiscoveredGraphViewRawData,
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
