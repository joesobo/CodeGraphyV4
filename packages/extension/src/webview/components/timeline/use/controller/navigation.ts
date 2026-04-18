import { useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ICommitInfo } from '../../../../../shared/timeline/contracts';
import { postMessage } from '../../../../vscodeApi';
import {
  runJumpToCommitAction,
  runJumpToEndAction,
  runPlayPauseAction,
} from '../../playbackActions';
import { resetTimelinePlaybackToStart } from './resetToStart';
import { useTimelinePlayFromStart } from './playFromStart';

export interface UseTimelineNavigationOptions {
  currentCommitSha: string | null;
  currentIndex: number;
  isAtEnd: boolean;
  isPlaying: boolean;
  lastSentCommitIndexRef: MutableRefObject<number>;
  setIsPlaying: (value: boolean) => void;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  startFromTimeRef: MutableRefObject<number | null>;
  timelineCommits: ICommitInfo[];
}

export interface UseTimelineNavigationResult {
  handleJumpToCommit: (sha: string) => void;
  handleJumpToEnd: () => void;
  handleJumpToNext: () => void;
  handleJumpToPrevious: () => void;
  handleJumpToStart: () => void;
  handlePlayPause: () => void;
}

export function useTimelineNavigation({
  currentCommitSha,
  currentIndex,
  isAtEnd,
  isPlaying,
  lastSentCommitIndexRef,
  setIsPlaying,
  setPlaybackTime,
  startFromTimeRef,
  timelineCommits,
}: UseTimelineNavigationOptions): UseTimelineNavigationResult {
  const pendingPlayFromStartRef = useRef(false);
  useTimelinePlayFromStart({
    currentCommitSha,
    lastSentCommitIndexRef,
    pendingPlayFromStartRef,
    setIsPlaying,
    setPlaybackTime,
    timelineCommits,
  });

  const handlePlayPause = () => {
    if (!isPlaying && isAtEnd) {
      pendingPlayFromStartRef.current = true;
      postMessage({ type: 'RESET_TIMELINE' });
      return;
    }

    runPlayPauseAction({
      isAtEnd,
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef,
      timelineCommits,
    });
  };

  const handleJumpToEnd = () => {
    runJumpToEndAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits,
    });
  };

  const handleJumpToStart = () => {
    resetTimelinePlaybackToStart({
      isPlaying,
      pendingPlayFromStartRef,
      setIsPlaying,
    });
  };

  const handleJumpToPrevious = () => {
    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: currentIndex - 1,
      timelineCommits,
    });
  };

  const handleJumpToNext = () => {
    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: currentIndex + 1,
      timelineCommits,
    });
  };

  const handleJumpToCommit = (sha: string) => {
    const targetIndex = timelineCommits.findIndex((commit) => commit.sha === sha);

    if (targetIndex < 0) {
      return;
    }

    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex,
      timelineCommits,
    });
  };

  return {
    handleJumpToCommit,
    handleJumpToEnd,
    handleJumpToNext,
    handleJumpToPrevious,
    handleJumpToStart,
    handlePlayPause,
  };
}
