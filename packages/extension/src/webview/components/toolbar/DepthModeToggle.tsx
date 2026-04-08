import React from 'react';
import { mdiBullseye } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

const DEPTH_VIEW_ID = 'codegraphy.depth-graph';
const CONNECTIONS_VIEW_ID = 'codegraphy.connections';

export function isDepthModeActive(activeViewId: string): boolean {
  return activeViewId === DEPTH_VIEW_ID;
}

export function DepthModeToggle(): React.ReactElement {
  const activeViewId = useGraphStore((state) => state.activeViewId);
  const graphHasIndex = useGraphStore((state) => state.graphHasIndex);
  const depthModeActive = isDepthModeActive(activeViewId);
  const title = depthModeActive ? 'Disable Depth Mode' : 'Enable Depth Mode';

  const handleToggleDepthMode = (): void => {
    postMessage({
      type: 'CHANGE_VIEW',
      payload: {
        viewId: depthModeActive ? CONNECTIONS_VIEW_ID : DEPTH_VIEW_ID,
      },
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={depthModeActive ? 'default' : 'outline'}
          size="icon"
          className="h-7 w-7 bg-transparent"
          onClick={handleToggleDepthMode}
          title={title}
          disabled={!graphHasIndex}
        >
          <MdiIcon path={mdiBullseye} size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {graphHasIndex ? title : 'Index the repo to enable depth mode'}
      </TooltipContent>
    </Tooltip>
  );
}
