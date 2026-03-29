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
      <div className="flex items-center justify-between">
        {/* Left side — toggle icons */}
        <div className="flex items-center gap-1.5">
          <ViewButtons />
          <DagModeToggle />
          <DimensionToggle />
          <NodeSizeToggle />
        </div>

        {/* Right side — action / popup menu buttons */}
        <ToolbarActions />
      </div>
    </TooltipProvider>
  );
}
