import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ICommitInfo } from '../../../../shared/timeline/types';
import { postMessage } from '../../../vscodeApi';
import {
  runJumpToCommitAction,
  runJumpToEndAction,
  runPlayPauseAction,
} from '../playbackActions';

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
  }, [currentCommitSha, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime, timelineCommits]);

  const handlePlayPause = useCallback(() => {
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
  }, [isAtEnd, isPlaying, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime, startFromTimeRef, timelineCommits]);

  const handleJumpToEnd = useCallback(() => {
    runJumpToEndAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits,
    });
  }, [isPlaying, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime, timelineCommits]);

  const handleJumpToStart = useCallback(() => {
    pendingPlayFromStartRef.current = false;

    if (isPlaying) {
      setIsPlaying(false);
    }

    postMessage({ type: 'RESET_TIMELINE' });
  }, [isPlaying, setIsPlaying]);

  const handleJumpToPrevious = useCallback(() => {
    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: currentIndex - 1,
      timelineCommits,
    });
  }, [currentIndex, isPlaying, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime, timelineCommits]);

  const handleJumpToNext = useCallback(() => {
    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: currentIndex + 1,
      timelineCommits,
    });
  }, [currentIndex, isPlaying, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime, timelineCommits]);

  const handleJumpToCommit = useCallback((sha: string) => {
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
  }, [isPlaying, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime, timelineCommits]);

  return {
    handleJumpToCommit,
    handleJumpToEnd,
    handleJumpToNext,
    handleJumpToPrevious,
    handleJumpToStart,
    handlePlayPause,
  };
}
