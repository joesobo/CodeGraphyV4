import { useEffect, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { isZoomKey } from './keyboard';
import {
  captureActivePointer,
  releasePointerCapture,
  shouldIgnorePointerStop,
} from './pointer';
import {
  clearHoldTimers,
  scheduleContinuousZoom,
} from './timers';

export interface ContinuousZoomHandlers {
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function useContinuousZoomControl(postZoom: () => void): ContinuousZoomHandlers {
  const activePointerIdRef = useRef<number | null>(null);
  const holdDelayRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  const stopZoom = (): void => {
    clearHoldTimers(holdDelayRef, holdIntervalRef);
    activePointerIdRef.current = null;
  };

  const startZoom = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return;

    captureActivePointer(event, activePointerIdRef);
    clearHoldTimers(holdDelayRef, holdIntervalRef);
    postZoom();
    scheduleContinuousZoom(postZoom, holdDelayRef, holdIntervalRef);
  };

  const stopPointerZoom = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (shouldIgnorePointerStop(activePointerIdRef.current, event)) return;

    releasePointerCapture(event);
    stopZoom();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (!isZoomKey(event.key)) return;

    event.preventDefault();
    postZoom();
  };

  useEffect(() => {
    const stopWindowZoom = (): void => {
      clearHoldTimers(holdDelayRef, holdIntervalRef);
      activePointerIdRef.current = null;
    };

    window.addEventListener('blur', stopWindowZoom);
    return () => {
      window.removeEventListener('blur', stopWindowZoom);
      stopWindowZoom();
    };
  }, []);

  return {
    onKeyDown: handleKeyDown,
    onLostPointerCapture: stopPointerZoom,
    onPointerCancel: stopPointerZoom,
    onPointerDown: startZoom,
    onPointerLeave: stopPointerZoom,
    onPointerUp: stopPointerZoom,
  };
}
