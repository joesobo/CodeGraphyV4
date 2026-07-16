import type { LinkTooltip } from '../../interaction/model';

function endpointLabel(endpoint: LinkTooltip['link']['source']): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.label;
}

export function OwnedGraphLinkTooltip({ tooltip, width }: { tooltip: LinkTooltip; width: number }): React.ReactElement {
  return <div className="pointer-events-none absolute max-w-72 rounded-md border border-border bg-popover px-3 py-2 text-[11px] text-popover-foreground shadow-md"
    data-testid="graph-edge-tooltip"
    style={{ left: Math.min(tooltip.screen.x + 12, Math.max(8, width - 292)), top: tooltip.screen.y + 12, zIndex: 1000 }}>
    <p className="font-semibold text-link break-all">{endpointLabel(tooltip.link.source)}{' → '}{endpointLabel(tooltip.link.target)}</p>
    <p className="font-mono text-muted-foreground">{tooltip.link.kind ?? tooltip.link.runtimeEdgeType ?? 'Connection'}</p>
  </div>;
}
