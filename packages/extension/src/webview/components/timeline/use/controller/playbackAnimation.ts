import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ICommitInfo } from '../../../../../shared/timeline/contracts';
import { stopTimelinePlayback } from '../../cleanup';
import { createTimelinePlaybackTick, type TimelinePlaybackRefs } from '../../playbackTick';

export function useTimelinePlaybackAnimation(options: {
  isPlaying: boolean;
  refs: TimelinePlaybackRefs & {
    startFromTimeRef: MutableRefObject<number | null>;
  };
  setIsPlaying: (value: boolean) => void;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  timelineCommits: ICommitInfo[];
}): void {
  const { isPlaying, refs, setIsPlaying, setPlaybackTime, timelineCommits } = options;
  const {
    lastFrameTimeRef,
    lastSentCommitIndexRef,
    playbackSpeedRef,
    rafRef,
    startFromTimeRef,
  } = refs;

  useEffect(() => {
    if (!isPlaying || timelineCommits.length === 0) {
      stopTimelinePlayback(rafRef);
      return;
    }

    if (startFromTimeRef.current !== null) {
      setPlaybackTime(startFromTimeRef.current);
      startFromTimeRef.current = null;
    }

    const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
    const tick = createTimelinePlaybackTick({
      maxTimestamp,
      refs: {
        lastFrameTimeRef,
        lastSentCommitIndexRef,
        playbackSpeedRef,
        rafRef,
      },
      setIsPlaying,
      setPlaybackTime,
      timelineCommits,
    });

    lastFrameTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      stopTimelinePlayback(rafRef);
    };
  }, [
    isPlaying,
    lastFrameTimeRef,
    lastSentCommitIndexRef,
    playbackSpeedRef,
    rafRef,
    setIsPlaying,
    setPlaybackTime,
    startFromTimeRef,
    timelineCommits,
  ]);
}
