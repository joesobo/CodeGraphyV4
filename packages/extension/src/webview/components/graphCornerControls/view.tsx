import React from 'react';
import {
  mdiArrowExpandAll,
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
              <MdiIcon path={mdiArrowExpandAll} size={18} />
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
