import type { MutableRefObject } from 'react';
import type { LinkTooltip } from './interaction';
import type { OwnedGraphPerformanceSample } from './performance/model';
import { formatOwnedGraphPerformance } from './performance/presentation';
import { OwnedGraphLinkTooltip } from './viewTooltip';

export function OwnedGraphStatusOverlays({ error, fpsOutputRef, performanceSample, tooltip, width }: {
  error: string | null; fpsOutputRef: MutableRefObject<HTMLOutputElement | null>;
  performanceSample: OwnedGraphPerformanceSample | null; tooltip: LinkTooltip | null; width: number;
}): React.ReactElement {
  return <>
    {performanceSample ? <output ref={fpsOutputRef}
      className="pointer-events-none absolute right-2 top-10 whitespace-nowrap rounded bg-popover/80 px-1.5 py-0.5 font-mono text-xs text-popover-foreground"
      data-codegraphy-overlay="fps" data-performance-status={performanceSample.status}
      data-testid="graph-fps" style={{ zIndex: 20 }}>{formatOwnedGraphPerformance(performanceSample)}</output> : null}
    {error ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground"
      data-testid="graph-webgpu-error" role="alert">{error}</div> : null}
    {tooltip ? <OwnedGraphLinkTooltip tooltip={tooltip} width={width} /> : null}
  </>;
}
