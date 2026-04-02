import React, { useState } from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { TooltipProvider } from './ui/overlay/tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/overlay/tooltip';
import { Button } from './ui/button';
import { MdiIcon } from './icons/MdiIcon';
import { cn } from './ui/cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/disclosure/collapsible';
import { ViewButtons } from './toolbar/ViewButtons';
import { DagModeToggle } from './toolbar/DagModeToggle';
import { DimensionToggle } from './toolbar/DimensionToggle';
import { NodeSizeToggle } from './toolbar/NodeSizeToggle';
import { ToolbarActions } from './toolbar/Actions';

export default function Toolbar(): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-testid="toolbar"
        className="flex h-full min-h-0 flex-col items-center justify-between gap-3 bg-transparent"
      >
        <Collapsible
          open={isExpanded}
          onOpenChange={setIsExpanded}
          data-testid="toolbar-top-group"
          className="flex flex-col items-center"
        >
          <CollapsibleContent
            forceMount
            data-testid="toolbar-primary-controls"
            className={cn(
              'overflow-hidden transition-[max-height,opacity,margin,transform] duration-200 ease-out',
              isExpanded
                ? 'mb-1.5 max-h-96 opacity-100 translate-y-0'
                : 'mb-0 max-h-0 opacity-0 -translate-y-1 pointer-events-none',
            )}
          >
            <div className="flex flex-col items-center gap-1.5">
              <ViewButtons />
              <DagModeToggle />
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
                  title={isExpanded ? 'Collapse Toolbar' : 'Expand Toolbar'}
                >
                  <MdiIcon path={isExpanded ? mdiChevronUp : mdiChevronDown} size={16} />
                </Button>
              </CollapsibleTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isExpanded ? 'Collapse Toolbar' : 'Expand Toolbar'}
            </TooltipContent>
          </Tooltip>
        </Collapsible>
        <div
          data-testid="toolbar-bottom-group"
          className="flex flex-col items-center gap-1.5"
        >
          <ToolbarActions />
        </div>
      </div>
    </TooltipProvider>
  );
}
