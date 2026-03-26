import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ICommitInfo } from '../../../shared/contracts';

export function syncTimelinePlaybackFromCommit(options: {
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

  if (isPlaying || userScrubActiveRef.current || !currentCommitSha || timelineCommits.length === 0) {
    return;
  }

  const commit = timelineCommits.find((candidate) => candidate.sha === currentCommitSha);
  if (!commit) {
    return;
  }

  setPlaybackTime(commit.timestamp);
  lastSentCommitIndexRef.current = timelineCommits.indexOf(commit);
}
