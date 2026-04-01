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

export interface JumpToCommitActionOptions extends JumpToEndActionOptions {
  targetIndex: number;
}

export interface ResetTimelineActionOptions {
  isPlaying: boolean;
  lastSentCommitIndexRef: MutableRefObject<number>;
  setIsPlaying: (value: boolean) => void;
}

export function runJumpToCommitAction({
  isPlaying,
  lastSentCommitIndexRef,
  setIsPlaying,
  setPlaybackTime,
  targetIndex,
  timelineCommits,
}: JumpToCommitActionOptions): void {
  if (timelineCommits.length === 0) {
    return;
  }

  const clampedIndex = Math.max(0, Math.min(targetIndex, timelineCommits.length - 1));

  if (isPlaying) {
    setIsPlaying(false);
  }

  const targetCommit = timelineCommits[clampedIndex];
  setPlaybackTime(targetCommit.timestamp);
  lastSentCommitIndexRef.current = clampedIndex;
  postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: targetCommit.sha } });
}

export function runJumpToEndAction({
  isPlaying,
  lastSentCommitIndexRef,
  setIsPlaying,
  setPlaybackTime,
  timelineCommits,
}: JumpToEndActionOptions): void {
  runJumpToCommitAction({
    isPlaying,
    lastSentCommitIndexRef,
    setIsPlaying,
    setPlaybackTime,
    targetIndex: timelineCommits.length - 1,
    timelineCommits,
  });
}

export function runResetTimelineAction({
  isPlaying,
  lastSentCommitIndexRef,
  setIsPlaying,
}: ResetTimelineActionOptions): void {
  if (isPlaying) {
    setIsPlaying(false);
  }

  lastSentCommitIndexRef.current = -1;
  postMessage({ type: 'RESET_TIMELINE' });
}

export const handleTimelinePlayPause = runPlayPauseAction;
export const jumpTimelineToEnd = runJumpToEndAction;
