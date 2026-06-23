import type { ReactElement } from 'react';
import type { ViewportProps } from '../contracts';

export function ViewportMarqueeSelectionOverlay({
  marqueeSelection,
}: Pick<ViewportProps, 'marqueeSelection'>): ReactElement | null {
  return marqueeSelection ? (
    <div
      data-testid="graph-marquee-selection"
      className="pointer-events-none absolute z-20 rounded-sm border border-dashed border-[var(--cg-focus-border)] bg-[var(--cg-graph-marquee-background)]"
      style={{
        left: marqueeSelection.bounds.left,
        top: marqueeSelection.bounds.top,
        width: marqueeSelection.bounds.width,
        height: marqueeSelection.bounds.height,
      }}
    />
  ) : null;
}
