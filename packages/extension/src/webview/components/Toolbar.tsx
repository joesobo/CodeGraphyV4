import React from 'react';
import { TooltipProvider } from './ui/overlay/tooltip';
import { ViewButtons } from './toolbar/ViewButtons';
import { DagModeToggle } from './toolbar/DagModeToggle';
import { DimensionToggle } from './toolbar/DimensionToggle';
import { NodeSizeToggle } from './toolbar/NodeSizeToggle';
import { ToolbarActions } from './toolbar/Actions';

export default function Toolbar(): React.ReactElement {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-testid="toolbar"
        className="flex h-full min-h-0 flex-col items-center justify-between gap-3 bg-transparent py-1"
      >
        <div
          data-testid="toolbar-top-group"
          className="flex flex-col items-center gap-1.5"
        >
          <ViewButtons />
          <DagModeToggle />
          <DimensionToggle />
          <NodeSizeToggle />
        </div>
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
