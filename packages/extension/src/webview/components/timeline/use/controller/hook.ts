import {
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { ICommitInfo } from '../../../../../shared/timeline/contracts';
import { getResponsiveAxisTickCount } from '../../format/dates';
import { getTimelineViewState } from '../../viewState';
import { useTimelineCleanup } from './cleanup';
import { useTimelineCommitSync } from './commitSync';
import { useTimelineNavigation } from './navigation';
import { useTimelinePlaybackAnimation } from './playbackAnimation';
import { useTimelineScrub } from './track/scrub';
import { useTimelineTrackElement } from './track/element';

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

  const { setTrackElement, trackWidth } = useTimelineTrackElement({
    trackElementRef,
  });

  const maxDateTicks = useMemo(
    () => getResponsiveAxisTickCount(trackWidth),
    [trackWidth],
  );

  const viewState = useMemo(
    () => getTimelineViewState(currentCommitSha, playbackTime, timelineCommits, maxDateTicks),
    [currentCommitSha, maxDateTicks, playbackTime, timelineCommits],
  );

  const {
    handleJumpToCommit,
    handleJumpToEnd,
    handleJumpToNext,
    handleJumpToPrevious,
    handleJumpToStart,
    handlePlayPause,
  } = useTimelineNavigation({
    currentCommitSha,
    currentIndex: viewState.currentIndex,
    isAtEnd: viewState.isAtEnd,
    isPlaying,
    lastSentCommitIndexRef,
    setIsPlaying,
    setPlaybackTime,
    startFromTimeRef,
    timelineCommits,
  });
  const { handleTrackMouseDown } = useTimelineScrub({
    debounceTimerRef,
    isPlaying,
    lastSentCommitIndexRef,
    scrubResetTimerRef,
    setIsPlaying,
    setPlaybackTime,
    timelineCommits,
    trackElementRef,
    userScrubActiveRef,
  });

  return {
    currentIndex: viewState.currentIndex,
    dateTicks: viewState.dateTicks,
    handleJumpToCommit,
    handleJumpToEnd,
    handleJumpToNext,
    handleJumpToPrevious,
    handleJumpToStart,
    handlePlayPause,
    handleTrackMouseDown,
    indicatorPosition: viewState.indicatorPosition,
    isAtEnd: viewState.isAtEnd,
    setTrackElement,
  };
}
