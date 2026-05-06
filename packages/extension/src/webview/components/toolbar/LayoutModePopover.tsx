import React from 'react';
import { mdiCheck } from '@mdi/js';
import { DagDefaultIcon } from '../icons/DagDefaultIcon';
import { DagLeftRightIcon } from '../icons/DagLeftRightIcon';
import { DagRadialIcon } from '../icons/DagRadialIcon';
import { DagTopDownIcon } from '../icons/DagTopDownIcon';
import { Button } from '../ui/button';
import { cn } from '../ui/cn';
import { MdiIcon } from '../icons/MdiIcon';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/overlay/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import type { DagMode } from '../../../shared/settings/modes';

type LayoutModeOption = {
  mode: DagMode;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
};

const LAYOUT_MODES: LayoutModeOption[] = [
  { mode: null, label: 'Default', Icon: DagDefaultIcon },
  { mode: 'radialout', label: 'Radial Out', Icon: DagRadialIcon },
  { mode: 'td', label: 'Top Down', Icon: DagTopDownIcon },
  { mode: 'lr', label: 'Left to Right', Icon: DagLeftRightIcon },
];

function getActiveLayoutMode(mode: DagMode): LayoutModeOption {
  return LAYOUT_MODES.find((option) => option.mode === mode) ?? LAYOUT_MODES[0];
}

export function LayoutModePopover(): React.ReactElement {
  const dagMode = useGraphStore((state) => state.dagMode);
  const activeMode = getActiveLayoutMode(dagMode);
  const ActiveIcon = activeMode.Icon;

  const handleSelect = (mode: DagMode): void => {
    postMessage({ type: 'UPDATE_DAG_MODE', payload: { dagMode: mode } });
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
              title="Layout"
              aria-label={`Layout: ${activeMode.label}`}
            >
              <ActiveIcon size={16} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Layout</TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="start" className="w-44 p-1">
        <div className="space-y-1" data-testid="layout-mode-popover">
          {LAYOUT_MODES.map(({ mode, label, Icon }) => {
            const active = dagMode === mode;

            return (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-full justify-start px-2 text-xs',
                  active && 'bg-[var(--cg-primary-faint)] text-primary',
                )}
                aria-pressed={active}
                onClick={() => handleSelect(mode)}
              >
                <Icon size={15} />
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
