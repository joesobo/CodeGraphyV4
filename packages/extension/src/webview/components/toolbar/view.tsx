import React, { useState } from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { TooltipProvider } from '../ui/overlay/tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';
import { Button } from '../ui/button';
import { MdiIcon } from '../icons/MdiIcon';
import { cn } from '../ui/cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/disclosure/collapsible';
import { DepthModeToggle } from './DepthModeToggle';
import { DagModeToggle } from './DagModeToggle';
import { DimensionToggle } from './DimensionToggle';
import { NodeSizeToggle } from './NodeSizeToggle';
import { ToolbarActions } from './actions/view';
import type { WebviewPluginHost } from '../../pluginHost/manager';
import { SlotHost } from '../../pluginHost/slotHost/view';

interface ToolbarProps {
  pluginHost?: WebviewPluginHost;
}

function ToolbarCollapseButton({
  expanded,
  expandLabel,
  collapseLabel,
  direction,
}: {
  expanded: boolean;
  expandLabel: string;
  collapseLabel: string;
  direction: 'up' | 'down';
}): React.ReactElement {
  const title = expanded ? collapseLabel : expandLabel;
  const expandedPath = direction === 'up' ? mdiChevronUp : mdiChevronDown;
  const collapsedPath = direction === 'up' ? mdiChevronDown : mdiChevronUp;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            title={title}
          >
            <MdiIcon path={expanded ? expandedPath : collapsedPath} size={16} />
          </Button>
        </CollapsibleTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarTopSection({
  expanded,
  onExpandedChange,
}: {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
}): React.ReactElement {
  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <div data-testid="toolbar-top-group" className="flex flex-col items-center">
        <CollapsibleContent
          forceMount
          data-testid="toolbar-primary-controls"
          className={cn(
            'overflow-hidden transition-[max-height,opacity,margin,transform] duration-200 ease-out',
            expanded
              ? 'mb-1.5 max-h-96 opacity-100 translate-y-0'
              : 'mb-0 max-h-0 opacity-0 -translate-y-1 pointer-events-none',
          )}
        >
          <div className="flex flex-col items-center gap-1.5">
            <DagModeToggle />
            <DepthModeToggle />
            <DimensionToggle />
            <NodeSizeToggle />
          </div>
        </CollapsibleContent>
        <ToolbarCollapseButton
          expanded={expanded}
          expandLabel="Expand Top Toolbar"
          collapseLabel="Collapse Top Toolbar"
          direction="up"
        />
      </div>
    </Collapsible>
  );
}

function ToolbarBottomSection({
  expanded,
  onExpandedChange,
}: {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
}): React.ReactElement {
  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <div
        data-testid="toolbar-bottom-group"
        className="flex flex-col items-center gap-1.5"
      >
        <ToolbarCollapseButton
          expanded={expanded}
          expandLabel="Expand Bottom Toolbar"
          collapseLabel="Collapse Bottom Toolbar"
          direction="down"
        />
        <CollapsibleContent
          forceMount
          data-testid="toolbar-secondary-controls"
          className={cn(
            'overflow-hidden transition-[max-height,opacity,margin,transform] duration-200 ease-out',
            expanded
              ? 'mt-0 max-h-96 opacity-100 translate-y-0'
              : 'mt-0 max-h-0 opacity-0 translate-y-1 pointer-events-none',
          )}
        >
          <ToolbarActions />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function Toolbar({ pluginHost }: ToolbarProps): React.ReactElement {
  const [isTopExpanded, setIsTopExpanded] = useState(true);
  const [isBottomExpanded, setIsBottomExpanded] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-testid="toolbar"
        className="flex h-full min-h-0 flex-col items-center justify-between gap-3 bg-transparent"
      >
        <ToolbarTopSection expanded={isTopExpanded} onExpandedChange={setIsTopExpanded} />
        {pluginHost ? (
          <SlotHost
            pluginHost={pluginHost}
            slot="toolbar"
            data-testid="toolbar-plugin-slot"
            className="flex flex-col items-center gap-1.5"
          />
        ) : null}
        <ToolbarBottomSection expanded={isBottomExpanded} onExpandedChange={setIsBottomExpanded} />
      </div>
    </TooltipProvider>
  );
}
