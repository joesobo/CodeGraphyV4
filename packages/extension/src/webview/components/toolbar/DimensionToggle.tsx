/**
 * @fileoverview 2D/3D dimension toggle button.
 * Switches the graph renderer between 2D canvas and 3D WebGL modes.
 * @module webview/components/toolbar/DimensionToggle
 */

import React from 'react';
import { mdiCircleOutline, mdiSphere } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';

export function getDimensionToggleTooltipLabel(graphMode: '2d' | '3d'): string {
  return graphMode === '2d' ? '2D Mode' : '3D Mode';
}

export function DimensionToggle(): React.ReactElement {
  const graphMode = useGraphStore(s => s.graphMode);
  const setGraphMode = useGraphStore(s => s.setGraphMode);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
          onClick={() => setGraphMode(graphMode === '2d' ? '3d' : '2d')}
        >
          <MdiIcon path={graphMode === '2d' ? mdiCircleOutline : mdiSphere} size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{getDimensionToggleTooltipLabel(graphMode)}</TooltipContent>
    </Tooltip>
  );
}
