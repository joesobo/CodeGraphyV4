import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisMode,
  GraphViewIndexingProgress,
} from '../execution';

const ANALYSIS_PHASE_BY_MODE: Record<GraphViewAnalysisMode, string> = {
  analyze: 'Indexing Workspace',
  load: 'Loading Graph',
  index: 'Indexing Workspace',
  refresh: 'Refreshing Index',
  incremental: 'Applying Changes',
};
const MAX_PROGRESS_BUCKETS_PER_PHASE = 20;

function supportsInitialProgress(mode: GraphViewAnalysisMode): boolean {
  return mode === 'index' || mode === 'refresh' || mode === 'incremental';
}

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

export function createGraphViewIndexProgressCoalescer<TProgress extends GraphViewIndexingProgress>(
  sendProgress: (progress: TProgress) => void,
): (progress: TProgress) => void {
  let lastPhase: string | undefined;
  let lastTotal: number | undefined;
  let lastBucket: number | undefined;

  return (progress) => {
    const bucket = getGraphViewIndexProgressBucket(progress);
    if (
      progress.phase === lastPhase
      && progress.total === lastTotal
      && bucket === lastBucket
    ) {
      return;
    }

    lastPhase = progress.phase;
    lastTotal = progress.total;
    lastBucket = bucket;
    sendProgress(progress);
  };
}

function getGraphViewIndexProgressBucket(progress: GraphViewIndexingProgress): number {
  if (progress.total <= MAX_PROGRESS_BUCKETS_PER_PHASE) {
    return progress.current;
  }

  const clampedCurrent = Math.max(0, Math.min(progress.current, progress.total));
  return Math.floor((clampedCurrent * MAX_PROGRESS_BUCKETS_PER_PHASE) / progress.total);
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
