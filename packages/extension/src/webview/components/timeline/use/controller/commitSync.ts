import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ICommitInfo } from '../../../../../shared/timeline/types';
import { syncTimelinePlaybackFromCommit } from '../../syncPlayback';

export function useTimelineCommitSync(options: {
  currentCommitSha: string | null;
  isPlaying: boolean;
  lastSentCommitIndexRef: MutableRefObject<number>;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  timelineCommits: ICommitInfo[];
  userScrubActiveRef: MutableRefObject<boolean>;
}): void {
  const {
    currentCommitSha,
    isPlaying,
    lastSentCommitIndexRef,
    setPlaybackTime,
    timelineCommits,
    userScrubActiveRef,
  } = options;

  useEffect(() => {
    syncTimelinePlaybackFromCommit({
      currentCommitSha,
      isPlaying,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits,
      userScrubActiveRef,
    });
  }, [
    currentCommitSha,
    isPlaying,
    lastSentCommitIndexRef,
    setPlaybackTime,
    timelineCommits,
    userScrubActiveRef,
  ]);
}
