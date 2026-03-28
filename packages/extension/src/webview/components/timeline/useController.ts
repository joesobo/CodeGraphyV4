import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { ICommitInfo } from '../../../shared/contracts';
import { bindTimelineDragListeners } from './dragListeners';
import { runJumpToEndAction, runPlayPauseAction } from './playbackActions';
import { jumpToTrackPosition } from './scrubPosition';
import { useTimelineCleanup } from './useCleanup';
import { useTimelineCommitSync } from './useCommitSync';
import { useTimelinePlaybackAnimation } from './usePlaybackAnimation';
import { getTimelineViewState } from './viewState';

export interface UseTimelineControllerOptions {
  currentCommitSha: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  setIsPlaying: (value: boolean) => void;
  timelineCommits: ICommitInfo[];
}

export interface UseTimelineControllerResult {
  dateTicks: number[];
  handleJumpToEnd: () => void;
  handlePlayPause: () => void;
  handleTrackMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  indicatorPosition: number;
  isAtEnd: boolean;
  setTrackElement: (element: HTMLDivElement | null) => void;
}

export function useTimelineController({
  currentCommitSha,
  isPlaying,
  playbackSpeed,
  setIsPlaying,
  timelineCommits,
}: UseTimelineControllerOptions): UseTimelineControllerResult {
  const trackElementRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const userScrubActiveRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const lastSentCommitIndexRef = useRef(-1);
  const startFromTimeRef = useRef<number | null>(null);
  const playbackSpeedRef = useRef(playbackSpeed);
  const [playbackTime, setPlaybackTime] = useState<number | null>(null);

  playbackSpeedRef.current = playbackSpeed;

  useTimelineCleanup({
    debounceTimerRef,
    rafRef,
    scrubResetTimerRef,
  });
  useTimelinePlaybackAnimation({
    isPlaying,
    refs: {
      lastFrameTimeRef,
      lastSentCommitIndexRef,
      playbackSpeedRef,
      rafRef,
      startFromTimeRef,
    },
    setIsPlaying,
    setPlaybackTime,
    timelineCommits,
  });
  useTimelineCommitSync({
    currentCommitSha,
    isPlaying,
    lastSentCommitIndexRef,
    setPlaybackTime,
    timelineCommits,
    userScrubActiveRef,
  });

  const scrubToClientX = useCallback((clientX: number) => {
    jumpToTrackPosition({
      clientX,
      debounceTimerRef,
      lastSentCommitIndexRef,
      scrubResetTimerRef,
      setPlaybackTime,
      timelineCommits,
      trackElement: trackElementRef.current,
      userScrubActiveRef,
    });
  }, [timelineCommits]);

  const handleTrackMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (isPlaying) {
      setIsPlaying(false);
    }
    isDraggingRef.current = true;
    scrubToClientX(event.clientX);
  }, [isPlaying, scrubToClientX, setIsPlaying]);

  useEffect(() => bindTimelineDragListeners({
    isDraggingRef,
    onDrag: scrubToClientX,
  }), [isDraggingRef, scrubToClientX]);

  const viewState = useMemo(
    () => getTimelineViewState(currentCommitSha, playbackTime, timelineCommits),
    [currentCommitSha, playbackTime, timelineCommits],
  );

  const handlePlayPause = useCallback(() => {
    runPlayPauseAction({
      isAtEnd: viewState.isAtEnd,
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef,
      timelineCommits,
    });
  }, [isPlaying, setIsPlaying, timelineCommits, viewState.isAtEnd]);

  const handleJumpToEnd = useCallback(() => {
    runJumpToEndAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits,
    });
  }, [isPlaying, setIsPlaying, timelineCommits]);

  const setTrackElement = useCallback((element: HTMLDivElement | null) => {
    trackElementRef.current = element;
  }, []);

  return {
    dateTicks: viewState.dateTicks,
    handleJumpToEnd,
    handlePlayPause,
    handleTrackMouseDown,
    indicatorPosition: viewState.indicatorPosition,
    isAtEnd: viewState.isAtEnd,
    setTrackElement,
  };
}
