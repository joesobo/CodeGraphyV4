import React, { useState } from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { TooltipProvider } from './ui/overlay/tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/overlay/tooltip';
import { Button } from './ui/button';
import { MdiIcon } from './icons/MdiIcon';
import { cn } from './ui/cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/disclosure/collapsible';
import { DepthModeToggle } from './toolbar/DepthModeToggle';
import { DagModeToggle } from './toolbar/DagModeToggle';
import { DimensionToggle } from './toolbar/DimensionToggle';
import { NodeSizeToggle } from './toolbar/NodeSizeToggle';
import { ToolbarActions } from './toolbar/Actions';
import type { WebviewPluginHost } from '../pluginHost/manager';
import { SlotHost } from '../pluginHost/slotHost/view';

interface ToolbarProps {
  pluginHost?: WebviewPluginHost;
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
        <Collapsible open={isTopExpanded} onOpenChange={setIsTopExpanded}>
          <div data-testid="toolbar-top-group" className="flex flex-col items-center">
            <CollapsibleContent
              forceMount
              data-testid="toolbar-primary-controls"
              className={cn(
                'overflow-hidden transition-[max-height,opacity,margin,transform] duration-200 ease-out',
                isTopExpanded
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
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-transparent"
                    title={isTopExpanded ? 'Collapse Top Toolbar' : 'Expand Top Toolbar'}
                  >
                    <MdiIcon path={isTopExpanded ? mdiChevronUp : mdiChevronDown} size={16} />
                  </Button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isTopExpanded ? 'Collapse Top Toolbar' : 'Expand Top Toolbar'}
              </TooltipContent>
            </Tooltip>
          </div>
        </Collapsible>
        {pluginHost ? (
          <SlotHost
            pluginHost={pluginHost}
            slot="toolbar"
            data-testid="toolbar-plugin-slot"
            className="flex flex-col items-center gap-1.5"
          />
        ) : null}
        <Collapsible open={isBottomExpanded} onOpenChange={setIsBottomExpanded}>
          <div
            data-testid="toolbar-bottom-group"
            className="flex flex-col items-center gap-1.5"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-transparent"
                    title={isBottomExpanded ? 'Collapse Bottom Toolbar' : 'Expand Bottom Toolbar'}
                  >
                    <MdiIcon path={isBottomExpanded ? mdiChevronDown : mdiChevronUp} size={16} />
                  </Button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isBottomExpanded ? 'Collapse Bottom Toolbar' : 'Expand Bottom Toolbar'}
              </TooltipContent>
            </Tooltip>
            <CollapsibleContent
              forceMount
              data-testid="toolbar-secondary-controls"
              className={cn(
                'overflow-hidden transition-[max-height,opacity,margin,transform] duration-200 ease-out',
                isBottomExpanded
                  ? 'mt-1.5 max-h-96 opacity-100 translate-y-0'
                  : 'mt-0 max-h-0 opacity-0 translate-y-1 pointer-events-none',
              )}
            >
              <ToolbarActions />
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
}
