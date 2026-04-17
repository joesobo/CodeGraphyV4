import type { MutableRefObject } from 'react';
import { postMessage } from '../../../../vscodeApi';

export interface ResetTimelinePlaybackToStartOptions {
  isPlaying: boolean;
  pendingPlayFromStartRef: MutableRefObject<boolean>;
  setIsPlaying: (value: boolean) => void;
}

export function resetTimelinePlaybackToStart({
  isPlaying,
  pendingPlayFromStartRef,
  setIsPlaying,
}: ResetTimelinePlaybackToStartOptions): void {
  pendingPlayFromStartRef.current = false;

  if (isPlaying) {
    setIsPlaying(false);
  }

  postMessage({ type: 'RESET_TIMELINE' });
}
