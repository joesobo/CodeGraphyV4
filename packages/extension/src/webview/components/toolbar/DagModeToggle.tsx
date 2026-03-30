/**
 * @fileoverview DAG layout mode toggle button group.
 * Allows switching between free-form, radial, top-down, and left-to-right layouts.
 * @module webview/components/toolbar/DagModeToggle
 */

import React from 'react';
import { DagDefaultIcon } from '../icons/DagDefaultIcon';
import { DagRadialIcon } from '../icons/DagRadialIcon';
import { DagTopDownIcon } from '../icons/DagTopDownIcon';
import { DagLeftRightIcon } from '../icons/DagLeftRightIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import type { DagMode } from '../../../shared/settings/modes';

const DAG_MODES: { mode: DagMode; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { mode: null, label: 'Default', Icon: DagDefaultIcon },
  { mode: 'radialout', label: 'Radial Out', Icon: DagRadialIcon },
  { mode: 'td', label: 'Top Down', Icon: DagTopDownIcon },
  { mode: 'lr', label: 'Left to Right', Icon: DagLeftRightIcon },
];

export function DagModeToggle(): React.ReactElement {
  const dagMode = useGraphStore(s => s.dagMode);

  const handleDagModeChange = (mode: DagMode) => {
    postMessage({ type: 'UPDATE_DAG_MODE', payload: { dagMode: mode } });
  };

  return (
    <div data-testid="dag-buttons" className="flex items-center bg-popover/80 backdrop-blur-sm rounded-md border border-border">
      {DAG_MODES.map(({ mode, label, Icon }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <Button
              variant={dagMode === mode ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleDagModeChange(mode)}
            >
              <Icon size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
