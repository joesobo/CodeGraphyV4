import {
  useCallback,
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
import { useContinuousZoomControl } from './zoom/hook';

type GraphCornerControlMessage = 'ZOOM_IN' | 'ZOOM_OUT' | 'FIT_VIEW' | 'REQUEST_OPEN_IN_EDITOR';
type ZoomControlMessage = Extract<GraphCornerControlMessage, 'ZOOM_IN' | 'ZOOM_OUT'>;

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

function ZoomButton({
  children,
  title,
  type,
}: {
  children: ReactNode;
  title: string;
  type: ZoomControlMessage;
}): ReactElement {
  const postZoom = useCallback(() => postGraphWindowMessage(type), [type]);
  const zoomHandlers = useContinuousZoomControl(postZoom);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground active:text-[var(--cg-primary)]"
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
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground active:text-[var(--cg-primary)]"
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
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground active:text-[var(--cg-primary)]"
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
