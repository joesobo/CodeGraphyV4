import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import {
  awaitGraphViewPluginActivation,
  ensureGraphViewAnalyzerInitialized,
} from './initialize';
import { publishEmptyGraph } from './publish';
import { recordExtensionPerformanceEvent } from '../../../performance/marks';

function recordPrepareStage(
  state: GraphViewAnalysisExecutionState,
  stage: string,
  startedAt: number,
  detail: Record<string, unknown> = {},
): void {
  recordExtensionPerformanceEvent(`graphAnalysis.prepare.${stage}`, {
    ...detail,
    durationMs: Date.now() - startedAt,
    mode: state.mode,
  });
}

function prepareAnalysisGroups(
  signal: AbortSignal,
  requestId: number,
  handlers: GraphViewAnalysisExecutionHandlers,
): boolean {
  handlers.computeMergedGroups();
  if (handlers.isAnalysisStale(signal, requestId)) {
    return false;
  }

  handlers.sendGroupsUpdated();
  return true;
}

function shouldPrepareAnalysisGroups(state: GraphViewAnalysisExecutionState): boolean {
  return state.mode !== 'incremental';
}

export async function prepareGraphViewAnalysis(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<boolean> {
  if (handlers.isAnalysisStale(signal, requestId)) {
    return false;
  }

  if (!state.analyzer) {
    publishEmptyGraph(handlers);
    return false;
  }

  let stageStartedAt = Date.now();
  if (!(await awaitGraphViewPluginActivation(signal, requestId, state, handlers))) {
    recordPrepareStage(state, 'pluginActivation', stageStartedAt, { stale: true });
    return false;
  }
  recordPrepareStage(state, 'pluginActivation', stageStartedAt);

  stageStartedAt = Date.now();
  if (!(await ensureGraphViewAnalyzerInitialized(signal, requestId, state, handlers))) {
    recordPrepareStage(state, 'analyzerInitialized', stageStartedAt, { stale: true });
    return false;
  }
  recordPrepareStage(state, 'analyzerInitialized', stageStartedAt, {
    alreadyInitialized: state.analyzerInitialized,
  });

  stageStartedAt = Date.now();
  if (shouldPrepareAnalysisGroups(state) && !prepareAnalysisGroups(signal, requestId, handlers)) {
    recordPrepareStage(state, 'groups', stageStartedAt, { stale: true });
    return false;
  }
  recordPrepareStage(state, 'groups', stageStartedAt, {
    skipped: !shouldPrepareAnalysisGroups(state),
  });

  stageStartedAt = Date.now();
  if (!handlers.hasWorkspace()) {
    recordPrepareStage(state, 'workspace', stageStartedAt, { hasWorkspace: false });
    publishEmptyGraph(handlers);
    return false;
  }
  recordPrepareStage(state, 'workspace', stageStartedAt, { hasWorkspace: true });

  return true;
}
