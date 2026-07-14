import React from 'react';
import {
  mdiCheck,
  mdiFileOutline,
  mdiHubOutline,
} from '@mdi/js';
import type { NodeSizeMode } from '../../../shared/settings/modes';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { cn } from '../ui/cn';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/overlay/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

type NodeSizeModeOption = {
  mode: NodeSizeMode;
  label: string;
  icon: string;
};

const NODE_SIZE_MODES: NodeSizeModeOption[] = [
  { mode: 'connections', label: 'Connections', icon: mdiHubOutline },
  { mode: 'file-size', label: 'File Size', icon: mdiFileOutline },
];

function getActiveNodeSizeMode(mode: NodeSizeMode): NodeSizeModeOption {
  return NODE_SIZE_MODES.find((option) => option.mode === mode) ?? NODE_SIZE_MODES[0];
}

export function NodeSizeModePopover(): React.ReactElement {
  const nodeSizeMode = useGraphStore((state) => state.nodeSizeMode);
  const activeMode = getActiveNodeSizeMode(nodeSizeMode);

  const handleSelect = (mode: NodeSizeMode, disabled: boolean): void => {
    if (disabled) {
      return;
    }

    postMessage({ type: 'UPDATE_NODE_SIZE_MODE', payload: { nodeSizeMode: mode } });
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-transparent"
              title="Node Size"
              aria-label={`Node Size: ${activeMode.label}`}
            >
              <MdiIcon path={activeMode.icon} size={16} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Node Size</TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="start" className="w-48 p-1">
        <div className="space-y-1" data-testid="node-size-mode-popover">
          {NODE_SIZE_MODES.map(({ mode, label, icon }) => {
            const disabled = false;
            const active = nodeSizeMode === mode;
            const title = label;

            return (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-full justify-start px-2 text-xs',
                  active && 'bg-[var(--cg-primary-faint)] text-primary',
                )}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => handleSelect(mode, disabled)}
                title={title}
              >
                <MdiIcon path={icon} size={15} />
                <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                {active ? <MdiIcon path={mdiCheck} size={14} /> : null}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
