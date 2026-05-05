import type { MutableRefObject } from 'react';

const ZOOM_HOLD_DELAY_MS = 250;
const ZOOM_HOLD_INTERVAL_MS = 90;

type ZoomTimerRef = MutableRefObject<number | null>;

export function clearHoldTimers(
  holdDelayRef: ZoomTimerRef,
  holdIntervalRef: ZoomTimerRef,
): void {
  if (holdDelayRef.current !== null) {
    window.clearTimeout(holdDelayRef.current);
    holdDelayRef.current = null;
  }
  if (holdIntervalRef.current !== null) {
    window.clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = null;
  }
}

export function scheduleContinuousZoom(
  postZoom: () => void,
  holdDelayRef: ZoomTimerRef,
  holdIntervalRef: ZoomTimerRef,
): void {
  holdDelayRef.current = window.setTimeout(() => {
    postZoom();
    holdIntervalRef.current = window.setInterval(postZoom, ZOOM_HOLD_INTERVAL_MS);
  }, ZOOM_HOLD_DELAY_MS);
}
