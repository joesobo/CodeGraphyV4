import { useEffect, type MutableRefObject } from 'react';
import { cleanupTimelineController } from '../../cleanup';

export function useTimelineCleanup(options: {
  debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  rafRef: MutableRefObject<number | null>;
  scrubResetTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}): void {
  const { debounceTimerRef, rafRef, scrubResetTimerRef } = options;

  useEffect(() => {
    return () => {
      cleanupTimelineController({
        debounceTimerRef,
        rafRef,
        scrubResetTimerRef,
      });
    };
  }, [debounceTimerRef, rafRef, scrubResetTimerRef]);
}
