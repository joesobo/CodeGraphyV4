import React, { useEffect, useRef, useState } from 'react';

const COLOR_DEBOUNCE_MS = 150;

export function LegendColorInput({
  ariaLabel,
  color,
  onCommit,
  immediate = false,
}: {
  ariaLabel: string;
  color: string;
  onCommit: (color: string) => void;
  immediate?: boolean;
}): React.ReactElement {
  const [draftColor, setDraftColor] = useState(color);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingColorRef = useRef(color);

  useEffect(() => {
    setDraftColor(color);
    pendingColorRef.current = color;
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

  return (
    <label
      className="relative block h-5 w-8 shrink-0 overflow-hidden rounded-sm border border-black/10 cursor-pointer"
      style={{ backgroundColor: draftColor }}
    >
      <input
        aria-label={ariaLabel}
        type="color"
        value={draftColor}
        onChange={(event) => {
          const nextColor = event.target.value;
          setDraftColor(nextColor);
          pendingColorRef.current = nextColor;
          if (immediate) {
            commitColor(nextColor);
            return;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            commitColor(nextColor);
          }, COLOR_DEBOUNCE_MS);
        }}
        onBlur={() => {
          if (pendingColorRef.current !== color) {
            commitColor(pendingColorRef.current);
          }
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
