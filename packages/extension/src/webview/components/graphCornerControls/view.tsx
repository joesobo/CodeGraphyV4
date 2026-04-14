import React from 'react';
import {
  mdiMagnifyMinusOutline,
  mdiMagnifyPlusOutline,
  mdiOpenInNew,
} from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/overlay/tooltip';
import { postMessage } from '../../vscodeApi';

function postGraphWindowMessage(type: 'ZOOM_IN' | 'ZOOM_OUT' | 'FIT_VIEW'): void {
  window.postMessage({ type }, '*');
}

function FitToScreenIcon(): React.ReactElement {
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

export function GraphCornerControls(): React.ReactElement {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-popover/95 backdrop-blur-sm"
              title="Zoom In"
              onClick={() => postGraphWindowMessage('ZOOM_IN')}
            >
              <MdiIcon path={mdiMagnifyPlusOutline} size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-popover/95 backdrop-blur-sm"
              title="Zoom Out"
              onClick={() => postGraphWindowMessage('ZOOM_OUT')}
            >
              <MdiIcon path={mdiMagnifyMinusOutline} size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom Out</TooltipContent>
        </Tooltip>

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
              onClick={() => postMessage({ type: 'OPEN_IN_EDITOR' })}
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
