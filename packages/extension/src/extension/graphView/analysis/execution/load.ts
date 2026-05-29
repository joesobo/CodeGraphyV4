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
} from './load/analyzerData';
import { getGraphIndexFreshness } from './load/freshness';
import { selectGraphViewRawDataLoadDecision } from './load/routing';

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
  const decision = selectGraphViewRawDataLoadDecision(state.mode, indexFreshness);
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
