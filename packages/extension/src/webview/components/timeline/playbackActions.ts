import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ICommitInfo } from '../../../shared/timeline/types';
import { postMessage } from '../../vscodeApi';

export interface PlayPauseActionOptions {
  isAtEnd: boolean;
  isPlaying: boolean;
  lastSentCommitIndexRef: MutableRefObject<number>;
  setIsPlaying: (value: boolean) => void;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  startFromTimeRef: MutableRefObject<number | null>;
  timelineCommits: ICommitInfo[];
}

export function runPlayPauseAction({
  isAtEnd,
  isPlaying,
  lastSentCommitIndexRef,
  setIsPlaying,
  setPlaybackTime,
  startFromTimeRef,
  timelineCommits,
}: PlayPauseActionOptions): void {
  if (isPlaying) {
    setIsPlaying(false);
    return;
  }

  if (isAtEnd && timelineCommits.length > 0) {
    const firstCommit = timelineCommits[0];
    lastSentCommitIndexRef.current = -1;
    postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: firstCommit.sha } });
    startFromTimeRef.current = firstCommit.timestamp;
    setPlaybackTime(firstCommit.timestamp);
  }

  setIsPlaying(true);
}

export interface JumpToEndActionOptions {
  isPlaying: boolean;
  lastSentCommitIndexRef: MutableRefObject<number>;
  setIsPlaying: (value: boolean) => void;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  timelineCommits: ICommitInfo[];
}

export function runJumpToEndAction({
  isPlaying,
  lastSentCommitIndexRef,
  setIsPlaying,
  setPlaybackTime,
  timelineCommits,
}: JumpToEndActionOptions): void {
  if (timelineCommits.length === 0) {
    return;
  }

  if (isPlaying) {
    setIsPlaying(false);
  }

  const lastCommit = timelineCommits[timelineCommits.length - 1];
  setPlaybackTime(lastCommit.timestamp);
  lastSentCommitIndexRef.current = timelineCommits.length - 1;
  postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: lastCommit.sha } });
}

export const handleTimelinePlayPause = runPlayPauseAction;
export const jumpTimelineToEnd = runJumpToEndAction;
