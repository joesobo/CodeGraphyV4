import type { MutableRefObject } from 'react';

export function cleanupTimelineController(options: {
  debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  rafRef: MutableRefObject<number | null>;
  scrubResetTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}): void {
  if (options.debounceTimerRef.current) {
    clearTimeout(options.debounceTimerRef.current);
  }
  if (options.scrubResetTimerRef.current) {
    clearTimeout(options.scrubResetTimerRef.current);
  }
  if (options.rafRef.current) {
    cancelAnimationFrame(options.rafRef.current);
  }
}

export function stopTimelinePlayback(
  rafRef: MutableRefObject<number | null>,
): void {
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }
}
