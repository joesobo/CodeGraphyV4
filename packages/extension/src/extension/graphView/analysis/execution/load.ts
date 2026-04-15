import type { IGraphData } from '../../../../shared/graph/types';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
  GraphViewIndexingProgress,
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

function shouldDiscoverGraph(state: GraphViewAnalysisExecutionState): boolean {
  return state.mode === 'load' && !state.analyzer?.hasIndex();
}

async function discoverGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
): Promise<IGraphData> {
  return (await state.analyzer?.discoverGraph(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
  )) ?? EMPTY_GRAPH_DATA;
}

async function analyzeGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  forwardProgress: (progress: GraphViewIndexingProgress) => void,
): Promise<IGraphData> {
  return (await state.analyzer?.analyze(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
    forwardProgress,
  )) ?? EMPTY_GRAPH_DATA;
}

export async function loadGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<{ rawGraphData: IGraphData; shouldDiscover: boolean }> {
  if (!state.analyzer) {
    return { rawGraphData: EMPTY_GRAPH_DATA, shouldDiscover: false };
  }

  const shouldDiscover = shouldDiscoverGraph(state);
  const forwardProgress = createGraphViewAnalysisProgressForwarder(state.mode, handlers);

  if (!shouldDiscover) {
    sendInitialGraphViewAnalysisProgress(state.mode, handlers);
  }

  if (shouldDiscover) {
    return {
      rawGraphData: await discoverGraphViewRawData(signal, state),
      shouldDiscover,
    };
  }

  if (state.mode === 'refresh') {
    return {
      rawGraphData: await refreshGraphViewRawData(signal, state, forwardProgress),
      shouldDiscover,
    };
  }

  if (state.mode === 'incremental') {
    return {
      rawGraphData: await refreshIncrementalGraphViewRawData(signal, state, forwardProgress),
      shouldDiscover,
    };
  }

  return {
    rawGraphData: await analyzeGraphViewRawData(signal, state, forwardProgress),
    shouldDiscover,
  };
}
