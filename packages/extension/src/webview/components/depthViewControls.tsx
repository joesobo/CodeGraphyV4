import React from 'react';
import { mdiBullseye } from '@mdi/js';
import { postMessage } from '../vscodeApi';
import { useGraphStore } from '../store/state';
import { Slider } from './ui/controls/slider';
import { MdiIcon } from './icons/MdiIcon';

const MIN_DEPTH = 1;

export function DepthViewControls(): React.ReactElement | null {
  const depthMode = useGraphStore(state => state.depthMode);
  const depthLimit = useGraphStore(state => state.depthLimit);
  const maxDepthLimit = useGraphStore(state => state.maxDepthLimit);
  const effectiveDepthLimit = Math.min(depthLimit, maxDepthLimit);
  const isCompactControl = maxDepthLimit === MIN_DEPTH;

  if (!depthMode) {
    return null;
  }

  const handleDepthChange = (value: number[]): void => {
    const nextDepthLimit = value[0] ?? effectiveDepthLimit;
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: nextDepthLimit } });
  };

  return (
    <div
      data-testid="depth-view-controls"
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center pl-16 pr-4 sm:pl-20 sm:pr-6"
    >
      <div
        data-testid="depth-view-shell"
        className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-md bg-[color:color-mix(in_srgb,var(--vscode-editorWidget-background,#1f1f1f)_86%,transparent)] px-2 py-1 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md"
      >
        {isCompactControl ? (
          <div
            data-testid="depth-view-compact"
            className="flex items-center gap-1.5 px-0.5"
          >
            <MdiIcon path={mdiBullseye} size={13} className="text-primary/85" />
            <div
              data-testid="depth-view-value"
              className="inline-flex min-w-4 items-center justify-center text-[11px] font-semibold leading-none tabular-nums text-foreground"
            >
              {effectiveDepthLimit}
            </div>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-1.5 px-0.5">
              <MdiIcon path={mdiBullseye} size={13} className="text-primary/85" />
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Depth
              </div>
              <div
                data-testid="depth-view-value"
                className="inline-flex min-w-4 items-center justify-center text-[11px] font-semibold leading-none tabular-nums text-foreground"
              >
                {effectiveDepthLimit}
              </div>
            </div>
            <div className="flex flex-1 items-center gap-1.5 px-0.5">
              <Slider
                data-testid="depth-view-slider"
                aria-label="Depth limit"
                className="flex-1"
                min={MIN_DEPTH}
                max={maxDepthLimit}
                step={1}
                value={[effectiveDepthLimit]}
                onValueChange={handleDepthChange}
                trackClassName="h-1 bg-primary/15"
                thumbClassName="h-3 w-3 border-0 bg-primary shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.28)] focus-visible:ring-[1.5px]"
              />
              <span
                data-testid="depth-view-max"
                className="text-[10px] font-medium leading-none tabular-nums text-muted-foreground"
              >
                {maxDepthLimit}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
