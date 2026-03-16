import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { ICommitInfo } from '../../../shared/types';
import { postMessage } from '../../lib/vscodeApi';
import { findCommitIndexAtTime, generateDateTicks } from './model';

const PLAYBACK_SECONDS_PER_DAY = 172800;
const SCRUB_DEBOUNCE_MS = 50;
const SCRUB_RELEASE_MS = 200;

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

  const currentIndex = useMemo(() => {
    if (!currentCommitSha || timelineCommits.length === 0) {
      return 0;
    }

    const index = timelineCommits.findIndex((commit) => commit.sha === currentCommitSha);
    return index >= 0 ? index : 0;
  }, [currentCommitSha, timelineCommits]);

  const isAtEnd = timelineCommits.length > 0 && currentIndex === timelineCommits.length - 1;

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (scrubResetTimerRef.current) {
        clearTimeout(scrubResetTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || timelineCommits.length === 0) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    if (startFromTimeRef.current !== null) {
      setPlaybackTime(startFromTimeRef.current);
      startFromTimeRef.current = null;
    }

    const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;

    const tick = (now: number) => {
      const delta = lastFrameTimeRef.current > 0 ? now - lastFrameTimeRef.current : 0;
      lastFrameTimeRef.current = now;

      setPlaybackTime((previous) => {
        if (previous === null) {
          return previous;
        }

        const nextTime =
          previous + (delta / 1000) * playbackSpeedRef.current * PLAYBACK_SECONDS_PER_DAY;
        const commitIndex = findCommitIndexAtTime(timelineCommits, nextTime);

        if (commitIndex > lastSentCommitIndexRef.current && commitIndex >= 0) {
          lastSentCommitIndexRef.current = commitIndex;
          postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: timelineCommits[commitIndex].sha } });
        }

        if (nextTime >= maxTimestamp) {
          setIsPlaying(false);
          return maxTimestamp;
        }

        return nextTime;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    lastFrameTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, setIsPlaying, timelineCommits]);

  useEffect(() => {
    if (isPlaying || userScrubActiveRef.current || !currentCommitSha || timelineCommits.length === 0) {
      return;
    }

    const commit = timelineCommits.find((candidate) => candidate.sha === currentCommitSha);
    if (!commit) {
      return;
    }

    setPlaybackTime(commit.timestamp);
    lastSentCommitIndexRef.current = timelineCommits.indexOf(commit);
  }, [currentCommitSha, isPlaying, timelineCommits]);

  const jumpToPositionOnTrack = useCallback((clientX: number) => {
    const track = trackElementRef.current;
    if (!track || timelineCommits.length === 0) {
      return;
    }

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const minTimestamp = timelineCommits[0].timestamp;
    const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
    const targetTimestamp = minTimestamp + ratio * (maxTimestamp - minTimestamp);

    userScrubActiveRef.current = true;
    if (scrubResetTimerRef.current) {
      clearTimeout(scrubResetTimerRef.current);
    }

    setPlaybackTime(targetTimestamp);

    const commitIndex = Math.max(0, findCommitIndexAtTime(timelineCommits, targetTimestamp));
    lastSentCommitIndexRef.current = commitIndex;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: timelineCommits[commitIndex].sha } });
      scrubResetTimerRef.current = setTimeout(() => {
        userScrubActiveRef.current = false;
      }, SCRUB_RELEASE_MS);
    }, SCRUB_DEBOUNCE_MS);
  }, [timelineCommits]);

  const handleTrackMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (isPlaying) {
      setIsPlaying(false);
    }
    isDraggingRef.current = true;
    jumpToPositionOnTrack(event.clientX);
  }, [isPlaying, jumpToPositionOnTrack, setIsPlaying]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDraggingRef.current) {
        jumpToPositionOnTrack(event.clientX);
      }
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [jumpToPositionOnTrack]);

  const handlePlayPause = useCallback(() => {
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
  }, [isAtEnd, isPlaying, setIsPlaying, timelineCommits]);

  const handleJumpToEnd = useCallback(() => {
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
  }, [isPlaying, setIsPlaying, timelineCommits]);

  const { dateTicks, indicatorPosition } = useMemo(() => {
    if (timelineCommits.length === 0) {
      return {
        dateTicks: [] as number[],
        indicatorPosition: 0,
      };
    }

    const minTimestamp = timelineCommits[0].timestamp;
    const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
    const timeRange = maxTimestamp - minTimestamp || 1;
    const indicatorTimestamp = playbackTime
      ?? (currentCommitSha
        ? timelineCommits.find((commit) => commit.sha === currentCommitSha)?.timestamp ?? minTimestamp
        : minTimestamp);

    return {
      dateTicks: generateDateTicks(minTimestamp, maxTimestamp),
      indicatorPosition: Math.max(
        0,
        Math.min(100, ((indicatorTimestamp - minTimestamp) / timeRange) * 100),
      ),
    };
  }, [currentCommitSha, playbackTime, timelineCommits]);

  const setTrackElement = useCallback((element: HTMLDivElement | null) => {
    trackElementRef.current = element;
  }, []);

  return {
    dateTicks,
    handleJumpToEnd,
    handlePlayPause,
    handleTrackMouseDown,
    indicatorPosition,
    isAtEnd,
    setTrackElement,
  };
}
