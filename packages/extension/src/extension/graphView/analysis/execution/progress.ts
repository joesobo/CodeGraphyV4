import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisMode,
  GraphViewIndexingProgress,
} from '../execution';
import { createGraphViewIndexProgressCoalescer } from './progress/coalescer';
import { supportsInitialProgress } from './progress/modes';

export { createGraphViewIndexProgressCoalescer } from './progress/coalescer';

const ANALYSIS_PHASE_BY_MODE: Record<GraphViewAnalysisMode, string> = {
  analyze: 'Indexing Workspace',
  load: 'Loading Graph',
  index: 'Indexing Workspace',
  refresh: 'Refreshing Index',
  incremental: 'Applying Changes',
};
export function createGraphViewAnalysisProgressForwarder(
  mode: GraphViewAnalysisMode,
  handlers: GraphViewAnalysisExecutionHandlers,
): (progress: GraphViewIndexingProgress) => void {
  const phase = ANALYSIS_PHASE_BY_MODE[mode];
  const sendProgress = createGraphViewIndexProgressCoalescer((progress) => {
    handlers.sendIndexProgress?.(progress);
  });

  return (progress) => {
    sendProgress({
      ...progress,
      phase: progress.phase || phase,
    });
  };
}

export function sendInitialGraphViewAnalysisProgress(
  mode: GraphViewAnalysisMode,
  handlers: GraphViewAnalysisExecutionHandlers,
): void {
  if (!supportsInitialProgress(mode)) {
    return;
  }

  createGraphViewAnalysisProgressForwarder(mode, handlers)({
    phase: '',
    current: 0,
    total: 1,
  });
}
