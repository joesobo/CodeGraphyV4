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
        className="flex h-full min-h-0 flex-col justify-between gap-3 rounded-md border border-[var(--vscode-panel-border,#3c3c3c)] bg-[var(--vscode-sideBar-background,#1e1e1e)] p-1.5 shadow-lg"
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
