import React from 'react';

export interface GraphIndexStatusProgress {
  phase: string;
  current: number;
  total: number;
}

interface GraphIndexStatusProps {
  isIndexing: boolean;
  progress: GraphIndexStatusProgress | null;
}

export function GraphIndexStatus({
  isIndexing,
  progress,
}: GraphIndexStatusProps): React.ReactElement | null {
  if (!isIndexing || !progress) {
    return null;
  }

  const percent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div
      className="pointer-events-none absolute left-2 right-12 bottom-2 z-20 rounded-md border border-border bg-[var(--cg-popover-translucent)] px-2 py-1.5 shadow-sm backdrop-blur-sm"
      data-testid="graph-index-status"
    >
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress.phase}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        data-testid="graph-index-status-track"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          data-testid="graph-index-status-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
