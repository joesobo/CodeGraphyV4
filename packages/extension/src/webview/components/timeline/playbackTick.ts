import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ICommitInfo } from '../../../shared/timeline/contracts';
import { postMessage } from '../../vscodeApi';
import { findCommitIndexAtTime } from './format/commits';

const PLAYBACK_SECONDS_PER_DAY = 172800;

export interface TimelinePlaybackRefs {
  lastFrameTimeRef: MutableRefObject<number>;
  lastSentCommitIndexRef: MutableRefObject<number>;
  playbackSpeedRef: MutableRefObject<number>;
  rafRef: MutableRefObject<number | null>;
}

export function createTimelinePlaybackTick(options: {
  maxTimestamp: number;
  refs: TimelinePlaybackRefs;
  setIsPlaying: (value: boolean) => void;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  timelineCommits: ICommitInfo[];
}): (timestamp: number) => void {
  const { maxTimestamp, refs, setIsPlaying, setPlaybackTime, timelineCommits } = options;

  const tick = (now: number) => {
    const delta = refs.lastFrameTimeRef.current > 0 ? now - refs.lastFrameTimeRef.current : 0;
    refs.lastFrameTimeRef.current = now;

    setPlaybackTime((previous) => {
      if (previous === null) {
        return previous;
      }

      const nextTime =
        previous + (delta / 1000) * refs.playbackSpeedRef.current * PLAYBACK_SECONDS_PER_DAY;
      const commitIndex = findCommitIndexAtTime(timelineCommits, nextTime);

      if (commitIndex > refs.lastSentCommitIndexRef.current && commitIndex >= 0) {
        refs.lastSentCommitIndexRef.current = commitIndex;
        postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: timelineCommits[commitIndex].sha } });
      }

      if (nextTime >= maxTimestamp) {
        setIsPlaying(false);
        return maxTimestamp;
      }

      return nextTime;
    });

    refs.rafRef.current = requestAnimationFrame(tick);
  };

  return tick;
}
