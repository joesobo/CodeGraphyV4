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
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center pl-16 pr-4 sm:pl-20 sm:pr-6"
    >
      <div
        data-testid="depth-view-shell"
        className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-xl border border-[var(--vscode-panel-border,#3c3c3c)] bg-[color:color-mix(in_srgb,var(--vscode-editorWidget-background,#1f1f1f)_88%,transparent)] px-3 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur-md"
      >
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--vscode-panel-border,#3c3c3c)] bg-[var(--vscode-sideBar-background,#181818)]/80 px-3 py-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Depth
          </div>
          <div
            data-testid="depth-view-value"
            className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold leading-none text-primary"
          >
            {depthLimit}
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-[var(--vscode-panel-border,#3c3c3c)] bg-[var(--vscode-sideBar-background,#181818)]/65 px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            1
          </span>
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
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            5
          </span>
        </div>
      </div>
    </div>
  );
}
