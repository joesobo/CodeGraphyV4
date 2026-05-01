import React, {
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  mdiMagnifyMinusOutline,
  mdiMagnifyPlusOutline,
  mdiOpenInNew,
} from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/overlay/tooltip';

type GraphCornerControlMessage = 'ZOOM_IN' | 'ZOOM_OUT' | 'FIT_VIEW' | 'REQUEST_OPEN_IN_EDITOR';
type ZoomControlMessage = Extract<GraphCornerControlMessage, 'ZOOM_IN' | 'ZOOM_OUT'>;

const ZOOM_HOLD_DELAY_MS = 250;
const ZOOM_HOLD_INTERVAL_MS = 90;

function postGraphWindowMessage(type: GraphCornerControlMessage): void {
  window.postMessage({ type }, '*');
}

function FitToScreenIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4H5a1 1 0 0 0-1 1v3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M4 16v3a1 1 0 0 0 1 1h3" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}

function useContinuousZoomControl(type: ZoomControlMessage) {
  const activePointerIdRef = useRef<number | null>(null);
  const holdDelayRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  const clearHoldTimers = useCallback(() => {
    if (holdDelayRef.current !== null) {
      window.clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const stopZoom = useCallback(() => {
    clearHoldTimers();
    activePointerIdRef.current = null;
  }, [clearHoldTimers]);

  const postZoom = useCallback(() => {
    postGraphWindowMessage(type);
  }, [type]);

  const startZoom = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (typeof event.button === 'number' && event.button !== 0) return;

    if (typeof event.pointerId === 'number') {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      activePointerIdRef.current = event.pointerId;
    }
    clearHoldTimers();
    postZoom();

    holdDelayRef.current = window.setTimeout(() => {
      postZoom();
      holdIntervalRef.current = window.setInterval(postZoom, ZOOM_HOLD_INTERVAL_MS);
    }, ZOOM_HOLD_DELAY_MS);
  }, [clearHoldTimers, postZoom]);

  const stopPointerZoom = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (
      activePointerIdRef.current !== null &&
      typeof event.pointerId === 'number' &&
      event.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    if (
      typeof event.pointerId === 'number' &&
      event.currentTarget.hasPointerCapture?.(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopZoom();
  }, [stopZoom]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    postZoom();
  }, [postZoom]);

  useEffect(() => {
    window.addEventListener('blur', stopZoom);
    return () => {
      window.removeEventListener('blur', stopZoom);
      stopZoom();
    };
  }, [stopZoom]);

  return {
    onKeyDown: handleKeyDown,
    onPointerCancel: stopPointerZoom,
    onPointerDown: startZoom,
    onPointerLeave: stopPointerZoom,
    onPointerUp: stopPointerZoom,
    onLostPointerCapture: stopPointerZoom,
  };
}

function ZoomButton({
  children,
  title,
  type,
}: {
  children: ReactNode;
  title: string;
  type: ZoomControlMessage;
}): ReactElement {
  const zoomHandlers = useContinuousZoomControl(type);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-popover/95 backdrop-blur-sm"
          title={title}
          {...zoomHandlers}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{title}</TooltipContent>
    </Tooltip>
  );
}

export function GraphCornerControls(): ReactElement {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col items-center gap-1.5">
        <ZoomButton title="Zoom In" type="ZOOM_IN">
          <MdiIcon path={mdiMagnifyPlusOutline} size={18} />
        </ZoomButton>

        <ZoomButton title="Zoom Out" type="ZOOM_OUT">
          <MdiIcon path={mdiMagnifyMinusOutline} size={18} />
        </ZoomButton>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-popover/95 backdrop-blur-sm"
              title="Fit to Screen"
              onClick={() => postGraphWindowMessage('FIT_VIEW')}
            >
              <FitToScreenIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Fit to Screen</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-popover/95 backdrop-blur-sm"
              title="Open in Editor"
              onClick={() => postGraphWindowMessage('REQUEST_OPEN_IN_EDITOR')}
            >
              <MdiIcon path={mdiOpenInNew} size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open in Editor</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
