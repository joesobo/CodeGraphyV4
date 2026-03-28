/**
 * @fileoverview Node size mode toggle button group.
 * Allows switching between connection-based, file-size, access-count, and uniform sizing.
 * @module webview/components/toolbar/NodeSizeToggle
 */

import React from 'react';
import { mdiHubOutline, mdiFileOutline, mdiEyeOutline, mdiCircleMultipleOutline } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { useGraphStore } from '../../store';
import { postMessage } from '../../vscodeApi';
import type { NodeSizeMode } from '../../../shared/contracts';

const NODE_SIZE_MODES: { mode: NodeSizeMode; label: string; icon: string }[] = [
  { mode: 'connections', label: 'Size by Connections', icon: mdiHubOutline },
  { mode: 'file-size', label: 'Size by File Size', icon: mdiFileOutline },
  { mode: 'access-count', label: 'Size by Access Count', icon: mdiEyeOutline },
  { mode: 'uniform', label: 'Uniform Size', icon: mdiCircleMultipleOutline },
];

export function NodeSizeToggle(): React.ReactElement {
  const nodeSizeMode = useGraphStore(s => s.nodeSizeMode);

  const handleNodeSizeModeChange = (mode: NodeSizeMode) => {
    postMessage({ type: 'UPDATE_NODE_SIZE_MODE', payload: { nodeSizeMode: mode } });
  };

  return (
    <div data-testid="node-size-buttons" className="flex items-center bg-popover/80 backdrop-blur-sm rounded-md border border-border">
      {NODE_SIZE_MODES.map(({ mode, label, icon }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              variant={nodeSizeMode === mode ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleNodeSizeModeChange(mode)}
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
