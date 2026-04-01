import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { ICommitInfo } from '../../../../shared/timeline/types';
import { bindTimelineDragListeners } from '../dragListeners';
import { getResponsiveAxisTickCount } from '../format/dates';
import {
  runJumpToCommitAction,
  runJumpToEndAction,
  runPlayPauseAction,
  runResetTimelineAction,
} from '../playbackActions';
import { jumpToTrackPosition } from '../scrubPosition';
import { getTimelineViewState } from '../viewState';
import { useTimelineCleanup } from './cleanup';
import { useTimelineCommitSync } from './commitSync';
import { useTimelinePlaybackAnimation } from './playbackAnimation';

export interface UseTimelineControllerOptions {
  currentCommitSha: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  setIsPlaying: (value: boolean) => void;
  timelineCommits: ICommitInfo[];
}

export interface UseTimelineControllerResult {
  currentIndex: number;
  dateTicks: number[];
  handleJumpToCommit: (sha: string) => void;
  handleJumpToEnd: () => void;
  handleJumpToNext: () => void;
  handleJumpToPrevious: () => void;
  handleJumpToStart: () => void;
  handleReset: () => void;
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
  const [trackElement, setTrackElementState] = useState<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
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

  useEffect(() => {
    if (!trackElement) {
      setTrackWidth(0);
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      setTrackWidth(trackElement.getBoundingClientRect().width);
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setTrackWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(trackElement);
    setTrackWidth(trackElement.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, [trackElement]);

  const maxDateTicks = useMemo(
    () => getResponsiveAxisTickCount(trackWidth),
    [trackWidth],
  );

  const viewState = useMemo(
    () => getTimelineViewState(currentCommitSha, playbackTime, timelineCommits, maxDateTicks),
    [currentCommitSha, maxDateTicks, playbackTime, timelineCommits],
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

  const handleJumpToStart = useCallback(() => {
    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: 0,
      timelineCommits,
    });
  }, [isPlaying, setIsPlaying, timelineCommits]);

  const handleJumpToPrevious = useCallback(() => {
    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: viewState.currentIndex - 1,
      timelineCommits,
    });
  }, [isPlaying, setIsPlaying, timelineCommits, viewState.currentIndex]);

  const handleJumpToNext = useCallback(() => {
    runJumpToCommitAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: viewState.currentIndex + 1,
      timelineCommits,
    });
  }, [isPlaying, setIsPlaying, timelineCommits, viewState.currentIndex]);

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
  }, [isPlaying, setIsPlaying, timelineCommits]);

  const handleReset = useCallback(() => {
    runResetTimelineAction({
      isPlaying,
      lastSentCommitIndexRef,
      setIsPlaying,
    });
  }, [isPlaying, setIsPlaying]);

  const setTrackElement = useCallback((element: HTMLDivElement | null) => {
    trackElementRef.current = element;
    setTrackWidth(element?.getBoundingClientRect().width ?? 0);
    setTrackElementState(element);
  }, []);

  return {
    currentIndex: viewState.currentIndex,
    dateTicks: viewState.dateTicks,
    handleJumpToCommit,
    handleJumpToEnd,
    handleJumpToNext,
    handleJumpToPrevious,
    handleJumpToStart,
    handleReset,
    handlePlayPause,
    handleTrackMouseDown,
    indicatorPosition: viewState.indicatorPosition,
    isAtEnd: viewState.isAtEnd,
    setTrackElement,
  };
}
