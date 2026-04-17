import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { ICommitInfo } from '../../../../../shared/timeline/types';

export interface UseTimelinePlayFromStartOptions {
  currentCommitSha: string | null;
  lastSentCommitIndexRef: MutableRefObject<number>;
  pendingPlayFromStartRef: MutableRefObject<boolean>;
  setIsPlaying: (value: boolean) => void;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  timelineCommits: ICommitInfo[];
}

export function useTimelinePlayFromStart({
  currentCommitSha,
  lastSentCommitIndexRef,
  pendingPlayFromStartRef,
  setIsPlaying,
  setPlaybackTime,
  timelineCommits,
}: UseTimelinePlayFromStartOptions): void {
  useEffect(() => {
    if (!pendingPlayFromStartRef.current || !currentCommitSha) {
      return;
    }

    const targetIndex = timelineCommits.findIndex((commit) => commit.sha === currentCommitSha);
    if (targetIndex < 0) {
      return;
    }

    pendingPlayFromStartRef.current = false;
    lastSentCommitIndexRef.current = targetIndex;
    setPlaybackTime(timelineCommits[targetIndex].timestamp);
    setIsPlaying(true);
  }, [currentCommitSha, lastSentCommitIndexRef, pendingPlayFromStartRef, setIsPlaying, setPlaybackTime, timelineCommits]);
}
