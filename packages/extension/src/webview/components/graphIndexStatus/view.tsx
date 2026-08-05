import React from 'react';
import { OWNED_GRAPH_MINIMAP_RESERVED_LEFT } from '../graph/rendering/surface/owned2d/minimap/layout';
import { cn } from '../ui/cn';

export interface GraphIndexStatusProgress {
  phase: string;
  current: number;
  total: number;
}

interface GraphIndexStatusProps {
  isIndexing: boolean;
  progress: GraphIndexStatusProgress | null;
  showMinimap: boolean;
}

export function GraphIndexStatus({
  isIndexing,
  progress,
  showMinimap,
}: GraphIndexStatusProps): React.ReactElement | null {
  if (!isIndexing || !progress) {
    return null;
  }

  const current = Math.max(0, progress.current);
  const isIndeterminate = progress.total <= 0;
  const percent = !isIndeterminate
    ? Math.min(100, Math.round((current / progress.total) * 100))
    : 0;
  const progressText = isIndeterminate
    ? current === 1
      ? '1 candidate file found'
      : `${current} candidate files found`
    : `${percent}%`;

  return (
    <div
      className={cn(
        'pointer-events-none absolute right-12 bottom-2 z-20 rounded-md border border-border bg-[var(--cg-popover-translucent)] px-2 py-1.5 shadow-sm backdrop-blur-sm',
        !showMinimap && 'left-2',
      )}
      data-codegraphy-state="graph-indexing"
      data-testid="graph-index-status"
      style={showMinimap ? { left: OWNED_GRAPH_MINIMAP_RESERVED_LEFT } : undefined}
    >
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress.phase}</span>
        <span>{progressText}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        data-codegraphy-region="graph-index-progress-track"
        data-testid="graph-index-status-track"
        role="progressbar"
        aria-label="Indexing progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isIndeterminate ? undefined : percent}
        aria-valuetext={isIndeterminate
          ? `${progress.phase} ${progressText}`
          : `${progress.phase} ${percent}%`}
      >
        <div
          className={isIndeterminate
            ? 'h-full w-1/3 animate-index-progress rounded-full bg-primary'
            : 'h-full rounded-full bg-primary transition-all duration-200'}
          data-codegraphy-region="graph-index-progress-fill"
          data-codegraphy-progress={isIndeterminate ? 'indeterminate' : 'determinate'}
          data-testid="graph-index-status-fill"
          style={isIndeterminate ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
