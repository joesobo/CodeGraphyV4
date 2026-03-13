import React from 'react';
import { mdiHubOutline, mdiFileOutline, mdiCounter, mdiEqual } from '@mdi/js';
import { MdiIcon } from '../icons';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { useGraphStore } from '../../store';
import type { NodeSizeMode } from '../../../shared/types';

const NODE_SIZE_MODES: { mode: NodeSizeMode; label: string; icon: string }[] = [
  { mode: 'connections', label: 'Size by Connections', icon: mdiHubOutline },
  { mode: 'file-size', label: 'Size by File Size', icon: mdiFileOutline },
  { mode: 'access-count', label: 'Size by Access Count', icon: mdiCounter },
  { mode: 'uniform', label: 'Uniform Size', icon: mdiEqual },
];

export function NodeSizeToggle(): React.ReactElement {
  const nodeSizeMode = useGraphStore(s => s.nodeSizeMode);
  const setNodeSizeMode = useGraphStore(s => s.setNodeSizeMode);

  return (
    <div className="flex items-center bg-popover/80 backdrop-blur-sm rounded-md border border-border">
      {NODE_SIZE_MODES.map(({ mode, label, icon }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              variant={nodeSizeMode === mode ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setNodeSizeMode(mode)}
            >
              <MdiIcon path={icon} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
