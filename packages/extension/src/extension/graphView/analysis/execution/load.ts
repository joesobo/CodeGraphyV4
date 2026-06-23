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

  if (decision.route === 'discover') {
    const rawGraphData = await discoverGraphViewRawData(signal, state, analyzer);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'cached') {
    const cachedGraphData = await loadCachedGraphViewRawData(signal, state, analyzer, {
      includeCurrentGitignoreMetadata: indexFreshness !== 'stale',
      ...(indexFreshness === 'stale' ? { warmAnalysis: false } : {}),
    });
    if (hasReplayableGraphData(cachedGraphData)) {
      return {
        rawGraphData: cachedGraphData,
        shouldDiscover: decision.shouldDiscover,
      };
    }

    const rawGraphData = await refreshGraphViewRawData(signal, state, forwardProgress);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'refresh') {
    const rawGraphData = await refreshGraphViewRawData(signal, state, forwardProgress);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'incremental') {
    const rawGraphData = await refreshIncrementalGraphViewRawData(signal, state, forwardProgress);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  const rawGraphData = await analyzeGraphViewRawData(signal, state, analyzer, forwardProgress);
  return {
    rawGraphData,
    shouldDiscover: decision.shouldDiscover,
  };
}
