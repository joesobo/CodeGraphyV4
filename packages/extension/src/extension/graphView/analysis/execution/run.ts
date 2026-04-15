import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import { loadGraphViewRawData } from './load';
import { publishAnalyzedGraph } from './publish';

export async function runGraphViewAnalysis(
  signal: AbortSignal,
  requestId: number,
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
): Promise<boolean> {
  const { rawGraphData, shouldDiscover } = await loadGraphViewRawData(signal, state, handlers);
  if (handlers.isAnalysisStale(signal, requestId)) {
    return false;
  }

  publishAnalyzedGraph(state, handlers, rawGraphData, !shouldDiscover);
  return true;
}
