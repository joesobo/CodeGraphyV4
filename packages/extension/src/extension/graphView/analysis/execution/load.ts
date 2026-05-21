import type { IGraphData } from '../../../../shared/graph/contracts';
import type { CodeGraphyIndexFreshness } from '../../../repoSettings/freshness';
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

type GraphViewAnalyzer = NonNullable<GraphViewAnalysisExecutionState['analyzer']>;

function shouldDiscoverGraph(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
): boolean {
  return mode === 'load' && freshness === 'missing';
}

function shouldRefreshGraphIndex(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
): boolean {
  return mode === 'index'
    || mode === 'refresh'
    || (freshness === 'stale' && (mode === 'load' || mode === 'analyze'));
}

function getGraphIndexFreshness(analyzer: GraphViewAnalyzer): CodeGraphyIndexFreshness {
  const status = analyzer.getIndexStatus?.();
  if (status) {
    return status.freshness;
  }

  return analyzer.hasIndex() ? 'fresh' : 'missing';
}

async function discoverGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  analyzer: GraphViewAnalyzer,
): Promise<IGraphData> {
  return (await analyzer.discoverGraph?.(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
  )) ?? EMPTY_GRAPH_DATA;
}

async function analyzeGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  analyzer: GraphViewAnalyzer,
  forwardProgress: (progress: GraphViewIndexingProgress) => void,
): Promise<IGraphData> {
  return (await analyzer.analyze?.(
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
  const analyzer = state.analyzer;
  if (!analyzer) {
    return { rawGraphData: EMPTY_GRAPH_DATA, shouldDiscover: false };
  }

  const indexFreshness = getGraphIndexFreshness(analyzer);
  const shouldDiscover = shouldDiscoverGraph(state.mode, indexFreshness);
  const forwardProgress = createGraphViewAnalysisProgressForwarder(state.mode, handlers);

  if (!shouldDiscover) {
    sendInitialGraphViewAnalysisProgress(state.mode, handlers);
  }

  if (shouldDiscover) {
    return {
      rawGraphData: await discoverGraphViewRawData(signal, state, analyzer),
      shouldDiscover,
    };
  }

  if (shouldRefreshGraphIndex(state.mode, indexFreshness)) {
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
    rawGraphData: await analyzeGraphViewRawData(signal, state, analyzer, forwardProgress),
    shouldDiscover,
  };
}
