import React from 'react';

const COUNT_FORMATTER = new Intl.NumberFormat('en-US');

export function formatGraphStat(count: number, singular: string, plural: string): string {
  const label = count === 1 ? singular : plural;
  return `${COUNT_FORMATTER.format(count)} ${label}`;
}

export function buildGraphStatsLabel(nodeCount: number, edgeCount: number): string {
  return `${formatGraphStat(nodeCount, 'node', 'nodes')} • ${formatGraphStat(edgeCount, 'edge', 'edges')}`;
}

export function GraphStatsBadge({ label }: { label: string }): React.ReactElement {
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-background/50 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
      {label}
    </div>
  );
}
