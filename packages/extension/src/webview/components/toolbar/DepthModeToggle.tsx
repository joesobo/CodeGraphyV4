import React from 'react';
import { mdiBullseye } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

export function DepthModeToggle(): React.ReactElement {
  const depthMode = useGraphStore((state) => state.depthMode);
  const graphHasIndex = useGraphStore((state) => state.graphHasIndex);
  const depthModeActive = depthMode;
  const title = depthModeActive ? 'Disable Depth Mode' : 'Enable Depth Mode';

  const handleToggleDepthMode = (): void => {
    postMessage({
      type: 'UPDATE_DEPTH_MODE',
      payload: {
        depthMode: !depthModeActive,
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
