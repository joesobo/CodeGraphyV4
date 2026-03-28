import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ICommitInfo } from '../../../shared/contracts';
import { postMessage } from '../../vscodeApi';
import { findCommitIndexAtTime } from './commits';

const SCRUB_DEBOUNCE_MS = 50;
const SCRUB_RELEASE_MS = 200;

export function jumpToTrackPosition(options: {
  clientX: number;
  debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastSentCommitIndexRef: MutableRefObject<number>;
  scrubResetTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setPlaybackTime: Dispatch<SetStateAction<number | null>>;
  timelineCommits: ICommitInfo[];
  trackElement: HTMLDivElement | null;
  userScrubActiveRef: MutableRefObject<boolean>;
}): void {
  const {
    clientX,
    debounceTimerRef,
    lastSentCommitIndexRef,
    scrubResetTimerRef,
    setPlaybackTime,
    timelineCommits,
    trackElement,
    userScrubActiveRef,
  } = options;

  if (!trackElement || timelineCommits.length === 0) {
    return;
  }

  const rect = trackElement.getBoundingClientRect();
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
}
