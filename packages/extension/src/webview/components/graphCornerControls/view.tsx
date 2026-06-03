import {
  useCallback,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  mdiOpenInNew,
} from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/overlay/tooltip';
import { useContinuousZoomControl } from './zoom/hook';

type GraphCornerControlMessage = 'ZOOM_IN' | 'ZOOM_OUT' | 'FIT_VIEW' | 'REQUEST_OPEN_IN_EDITOR';
type ZoomControlMessage = Extract<GraphCornerControlMessage, 'ZOOM_IN' | 'ZOOM_OUT'>;
type ZoomDirection = 'in' | 'out';

const CORNER_BUTTON_CLASS = 'h-8 w-8 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground active:text-[var(--cg-primary)] [&_svg]:size-[18px]';
const CORNER_ICON_SIZE = 18;

function postGraphWindowMessage(type: GraphCornerControlMessage): void {
  window.postMessage({ type }, '*');
}

function FitToScreenIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={CORNER_ICON_SIZE} height={CORNER_ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4H5a1 1 0 0 0-1 1v3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M4 16v3a1 1 0 0 0 1 1h3" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}

function ZoomIcon({ direction }: { direction: ZoomDirection }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={CORNER_ICON_SIZE}
      height={CORNER_ICON_SIZE}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10.25" cy="10.25" r="5.75" />
      <path d="M14.6 14.6 20 20" />
      <path d="M7.6 10.25h5.3" />
      {direction === 'in' ? <path d="M10.25 7.6v5.3" /> : null}
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
          aria-label={title}
          className={CORNER_BUTTON_CLASS}
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
          <ZoomIcon direction="in" />
        </ZoomButton>

        <ZoomButton title="Zoom Out" type="ZOOM_OUT">
          <ZoomIcon direction="out" />
        </ZoomButton>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fit to Screen"
              className={CORNER_BUTTON_CLASS}
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
              aria-label="Open in Editor"
              className={CORNER_BUTTON_CLASS}
              title="Open in Editor"
              onClick={() => postGraphWindowMessage('REQUEST_OPEN_IN_EDITOR')}
            >
              <MdiIcon path={mdiOpenInNew} size={CORNER_ICON_SIZE} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open in Editor</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
