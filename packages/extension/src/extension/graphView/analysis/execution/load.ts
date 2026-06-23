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
import { recordExtensionPerformanceEvent } from '../../../performance/marks';
import type { CodeGraphyIndexFreshness } from '../../../repoSettings/freshness';

function hasReplayableGraphData(graphData: IGraphData): boolean {
  return graphData.nodes.length > 0 || graphData.edges.length > 0;
}

function recordLoadStage(
  state: GraphViewAnalysisExecutionState,
  stage: string,
  startedAt: number,
  detail: Record<string, unknown> = {},
): void {
  recordExtensionPerformanceEvent(`graphAnalysis.load.${stage}`, {
    ...detail,
    durationMs: Date.now() - startedAt,
    mode: state.mode,
  });
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

  let stageStartedAt = Date.now();
  const { decision, indexFreshness } = selectGraphViewRawDataLoadDecisionForState(state, analyzer);
  const diagnosticIndexFreshness = indexFreshness ?? 'skipped';
  recordLoadStage(state, 'decision', stageStartedAt, {
    canReplayCache: typeof analyzer.loadCachedGraph === 'function',
    indexFreshness: diagnosticIndexFreshness,
    route: decision.route,
    shouldDiscover: decision.shouldDiscover,
  });
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
    stageStartedAt = Date.now();
    sendInitialGraphViewAnalysisProgress(state.mode, handlers);
    recordLoadStage(state, 'initialProgress', stageStartedAt, {
      route: decision.route,
    });
  }

  if (decision.route === 'discover') {
    stageStartedAt = Date.now();
    const rawGraphData = await discoverGraphViewRawData(signal, state, analyzer);
    recordLoadStage(state, 'discover', stageStartedAt);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'cached') {
    stageStartedAt = Date.now();
    const cachedGraphData = await loadCachedGraphViewRawData(signal, state, analyzer, {
      includeCurrentGitignoreMetadata: indexFreshness !== 'stale',
    });
    recordLoadStage(state, 'cached', stageStartedAt, {
      edgeCount: cachedGraphData.edges.length,
      hasReplayableGraphData: hasReplayableGraphData(cachedGraphData),
      nodeCount: cachedGraphData.nodes.length,
    });
    if (hasReplayableGraphData(cachedGraphData)) {
      return {
        rawGraphData: cachedGraphData,
        shouldDiscover: decision.shouldDiscover,
      };
    }

    stageStartedAt = Date.now();
    const rawGraphData = await refreshGraphViewRawData(signal, state, forwardProgress);
    recordLoadStage(state, 'cachedFallbackRefresh', stageStartedAt);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'refresh') {
    stageStartedAt = Date.now();
    const rawGraphData = await refreshGraphViewRawData(signal, state, forwardProgress);
    recordLoadStage(state, 'refresh', stageStartedAt);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  if (decision.route === 'incremental') {
    stageStartedAt = Date.now();
    const rawGraphData = await refreshIncrementalGraphViewRawData(signal, state, forwardProgress);
    recordLoadStage(state, 'incremental', stageStartedAt);
    return {
      rawGraphData,
      shouldDiscover: decision.shouldDiscover,
    };
  }

  stageStartedAt = Date.now();
  const rawGraphData = await analyzeGraphViewRawData(signal, state, analyzer, forwardProgress);
  recordLoadStage(state, 'analyze', stageStartedAt);
  return {
    rawGraphData,
    shouldDiscover: decision.shouldDiscover,
  };
}
