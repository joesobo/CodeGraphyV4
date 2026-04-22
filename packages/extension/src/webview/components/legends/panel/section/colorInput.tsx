import React, { useEffect, useRef, useState } from 'react';
import { Slider } from '../../../ui/controls/slider';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/overlay/popover';
import {
  formatLegendColor,
  parseLegendColor,
  toLegendColorHex,
  withLegendAlpha,
  withLegendHexColor,
} from './colorModel';

const COLOR_DEBOUNCE_MS = 150;

interface LegendColorDraftState {
  displayedColor: string;
  draftColor: ReturnType<typeof parseLegendColor>;
  flushPendingColor: () => void;
  onHexChange: (value: string) => void;
  onOpacityChange: (value: number) => void;
}

function useLegendColorDraftState(
  color: string,
  immediate: boolean,
  onCommit: (color: string) => void,
): LegendColorDraftState {
  const [draftColor, setDraftColor] = useState(() => parseLegendColor(color));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingColorRef = useRef(color);

  useEffect(() => {
    const parsedColor = parseLegendColor(color);
    setDraftColor(parsedColor);
    pendingColorRef.current = formatLegendColor(parsedColor);
  }, [color]);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const commitColor = (nextColor: string): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    onCommit(nextColor);
  };

  const queueColor = (nextColor: ReturnType<typeof parseLegendColor>): void => {
    const formattedColor = formatLegendColor(nextColor);
    setDraftColor(nextColor);
    pendingColorRef.current = formattedColor;

    if (immediate) {
      commitColor(formattedColor);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      commitColor(formattedColor);
    }, COLOR_DEBOUNCE_MS);
  };

  return {
    displayedColor: formatLegendColor(draftColor),
    draftColor,
    flushPendingColor: () => {
      if (pendingColorRef.current !== color) {
        commitColor(pendingColorRef.current);
      }
    },
    onHexChange: (value: string) => {
      queueColor(withLegendHexColor(draftColor, value));
    },
    onOpacityChange: (value: number) => {
      queueColor(withLegendAlpha(draftColor, value));
    },
  };
}

export function LegendColorInput({
  ariaLabel,
  color,
  disabled = false,
  onCommit,
  immediate = false,
}: {
  ariaLabel: string;
  color: string;
  disabled?: boolean;
  onCommit: (color: string) => void;
  immediate?: boolean;
}): React.ReactElement {
  const {
    displayedColor,
    draftColor,
    flushPendingColor,
    onHexChange,
    onOpacityChange,
  } = useLegendColorDraftState(color, immediate, onCommit);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <input
        aria-label={ariaLabel}
        disabled={disabled}
        type="color"
        value={toLegendColorHex(draftColor)}
        onChange={(event) => onHexChange(event.target.value)}
        onBlur={flushPendingColor}
        className="sr-only"
      />
      <Popover
        onOpenChange={(open) => {
          if (!open) {
            flushPendingColor();
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            title={`Edit ${ariaLabel}`}
            className="relative block h-5 w-8 shrink-0 overflow-hidden rounded-sm border border-black/10 disabled:cursor-not-allowed"
            style={{ backgroundColor: displayedColor }}
          />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-3">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Color
              </div>
              <input
                aria-label={`${ariaLabel} base color`}
                type="color"
                value={toLegendColorHex(draftColor)}
                onChange={(event) => onHexChange(event.target.value)}
                className="h-9 w-full cursor-pointer rounded border border-border bg-transparent p-1"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Opacity</span>
                <span>{Math.round(draftColor.alpha * 100)}%</span>
              </div>
              <Slider
                aria-label={`${ariaLabel} opacity`}
                max={100}
                min={0}
                step={1}
                value={[Math.round(draftColor.alpha * 100)]}
                onValueChange={(value) => onOpacityChange((value[0] ?? 100) / 100)}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
