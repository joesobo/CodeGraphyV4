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

function hasReplayableGraphData(graphData: IGraphData): boolean {
  return graphData.nodes.length > 0 || graphData.edges.length > 0;
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

  const indexFreshness = getGraphIndexFreshness(analyzer);
  const decision = selectGraphViewRawDataLoadDecision(
    state.mode,
    indexFreshness,
    typeof analyzer.loadCachedGraph === 'function',
  );
  handlers.emitDiagnostic?.({
    area: 'extension.analysis',
    event: 'load-decision',
    context: {
      mode: state.mode,
      route: decision.route,
      shouldDiscover: decision.shouldDiscover,
      indexFreshness,
      canReplayCache: typeof analyzer.loadCachedGraph === 'function',
    },
  });
  const forwardProgress = createGraphViewAnalysisProgressForwarder(state.mode, handlers);

  if (!decision.shouldDiscover) {
    sendInitialGraphViewAnalysisProgress(state.mode, handlers);
  }

  if (decision.route === 'discover') {
    return {
      rawGraphData: await discoverGraphViewRawData(signal, state, analyzer),
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'cached') {
    const cachedGraphData = await loadCachedGraphViewRawData(signal, state, analyzer, {
      includeCurrentGitignoreMetadata: indexFreshness !== 'stale',
    });
    if (hasReplayableGraphData(cachedGraphData)) {
      return {
        rawGraphData: cachedGraphData,
        shouldDiscover: decision.shouldDiscover,
      };
    }

    return {
      rawGraphData: await refreshGraphViewRawData(signal, state, forwardProgress),
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'refresh') {
    return {
      rawGraphData: await refreshGraphViewRawData(signal, state, forwardProgress),
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'incremental') {
    return {
      rawGraphData: await refreshIncrementalGraphViewRawData(signal, state, forwardProgress),
      shouldDiscover: decision.shouldDiscover,
    };
  }

  return {
    rawGraphData: await analyzeGraphViewRawData(signal, state, analyzer, forwardProgress),
    shouldDiscover: decision.shouldDiscover,
  };
}
