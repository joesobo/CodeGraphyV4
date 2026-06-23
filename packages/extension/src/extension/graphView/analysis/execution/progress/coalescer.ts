import type { GraphViewIndexingProgress } from '../../execution';

const MAX_PROGRESS_BUCKETS_PER_PHASE = 20;

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
