import React from 'react';

const COUNT_FORMATTER = new Intl.NumberFormat('en-US');

export function formatGraphStat(count: number, singular: string, plural: string): string {
  const label = count === 1 ? singular : plural;
  return `${COUNT_FORMATTER.format(count)} ${label}`;
}

export function buildGraphStatsLabel(
  nodeCount: number,
  edgeCount: number,
): string {
  const nodeLabel = formatGraphStat(nodeCount, 'node', 'nodes');
  return `${nodeLabel} • ${formatGraphStat(edgeCount, 'connection', 'connections')}`;
}

export function GraphStatsBadge({ label }: { label: string }): React.ReactElement {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-background)] px-2 py-1 text-xs text-muted-foreground shadow-sm">
      {label}
    </div>
  );
}
