import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisMode,
  GraphViewIndexingProgress,
} from '../execution';

const ANALYSIS_PHASE_BY_MODE: Record<GraphViewAnalysisMode, string> = {
  analyze: 'Indexing Repo',
  load: 'Loading Graph',
  index: 'Indexing Repo',
  refresh: 'Refreshing Index',
  incremental: 'Applying Changes',
};

function supportsInitialProgress(mode: GraphViewAnalysisMode): boolean {
  return mode === 'index' || mode === 'refresh' || mode === 'incremental';
}

export function createGraphViewAnalysisProgressForwarder(
  mode: GraphViewAnalysisMode,
  handlers: GraphViewAnalysisExecutionHandlers,
): (progress: GraphViewIndexingProgress) => void {
  const phase = ANALYSIS_PHASE_BY_MODE[mode];

  return (progress) => {
    handlers.sendIndexProgress?.({
      ...progress,
      phase,
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
