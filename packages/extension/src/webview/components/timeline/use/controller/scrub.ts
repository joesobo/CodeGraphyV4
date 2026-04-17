import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction, type MouseEvent as ReactMouseEvent } from 'react';
import type { ICommitInfo } from '../../../../../shared/timeline/types';
import { bindTimelineDragListeners } from '../../dragListeners';
import { jumpToTrackPosition } from '../../scrubPosition';

export interface UseTimelineScrubOptions {
  debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  isPlaying: boolean;
  lastSentCommitIndexRef: MutableRefObject<number>;
  scrubResetTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setIsPlaying: (value: boolean) => void;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  timelineCommits: ICommitInfo[];
  trackElementRef: MutableRefObject<HTMLDivElement | null>;
  userScrubActiveRef: MutableRefObject<boolean>;
}

export interface UseTimelineScrubResult {
  handleTrackMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export function useTimelineScrub({
  debounceTimerRef,
  isPlaying,
  lastSentCommitIndexRef,
  scrubResetTimerRef,
  setIsPlaying,
  setPlaybackTime,
  timelineCommits,
  trackElementRef,
  userScrubActiveRef,
}: UseTimelineScrubOptions): UseTimelineScrubResult {
  const isDraggingRef = useRef(false);

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
  }, [
    debounceTimerRef,
    lastSentCommitIndexRef,
    scrubResetTimerRef,
    setPlaybackTime,
    timelineCommits,
    trackElementRef,
    userScrubActiveRef,
  ]);

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
  }), [scrubToClientX]);

  return {
    handleTrackMouseDown,
  };
}
