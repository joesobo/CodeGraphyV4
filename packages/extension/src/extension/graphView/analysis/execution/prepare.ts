import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import {
  awaitGraphViewPluginActivation,
  ensureGraphViewAnalyzerInitialized,
} from './initialize';
import { publishEmptyGraph } from './publish';

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

  if (!(await awaitGraphViewPluginActivation(signal, requestId, state, handlers))) {
    return false;
  }

  if (!(await ensureGraphViewAnalyzerInitialized(signal, requestId, state, handlers))) {
    return false;
  }

  if (!prepareAnalysisGroups(signal, requestId, handlers)) {
    return false;
  }

  if (!handlers.hasWorkspace()) {
    publishEmptyGraph(handlers);
    return false;
  }

  return true;
}
