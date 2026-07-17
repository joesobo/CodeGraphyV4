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
  const showMinimap = useGraphStore(state => state.showMinimap);
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
      className={`pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center pr-4 sm:pr-6 ${
        showMinimap ? 'pl-48' : 'pl-16 sm:pl-20'
      }`}
    >
      <div
        data-testid="depth-view-shell"
        className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-md bg-[var(--cg-popover-translucent)] px-2 py-1 shadow-lg backdrop-blur-md"
      >
        {isCompactControl ? (
          <div
            data-testid="depth-view-compact"
            className="flex items-center gap-1.5 px-0.5"
          >
            <MdiIcon path={mdiBullseye} size={13} className="text-[var(--cg-primary)]" />
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
              <MdiIcon path={mdiBullseye} size={13} className="text-[var(--cg-primary)]" />
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
                trackClassName="h-1 bg-[var(--cg-primary-faint)]"
                thumbClassName="h-3 w-3 border-0 bg-primary shadow focus-visible:ring-[1.5px]"
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
