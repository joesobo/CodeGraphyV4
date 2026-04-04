import React from 'react';
import { postMessage } from '../../vscodeApi';
import { useGraphStore } from '../../store/state';
import { Slider } from '../ui/controls/slider';

const MIN_DEPTH = 1;
const MAX_DEPTH = 5;
const ACTIVE_VIEW_ID = 'codegraphy.depth-graph';

export function DepthViewControls(): React.ReactElement | null {
  const activeViewId = useGraphStore(state => state.activeViewId);
  const depthLimit = useGraphStore(state => state.depthLimit);

  if (activeViewId !== ACTIVE_VIEW_ID) {
    return null;
  }

  const handleDepthChange = (value: number[]): void => {
    const nextDepthLimit = value[0] ?? depthLimit;
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: nextDepthLimit } });
  };

  return (
    <div
      data-testid="depth-view-controls"
      className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-lg border border-[var(--vscode-panel-border,#3c3c3c)] bg-popover/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="min-w-16 shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Depth
          </div>
          <div className="text-sm font-medium leading-none text-foreground">{depthLimit}</div>
        </div>
        <Slider
          data-testid="depth-view-slider"
          aria-label="Depth limit"
          className="flex-1"
          min={MIN_DEPTH}
          max={MAX_DEPTH}
          step={1}
          value={[depthLimit]}
          onValueChange={handleDepthChange}
        />
      </div>
    </div>
  );
}
