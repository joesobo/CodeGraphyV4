import React from 'react';
import { OWNED_GRAPH_MINIMAP_RESERVED_LEFT } from '../graph/rendering/surface/owned2d/minimap/layout';

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

  const percent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div
      className={`pointer-events-none absolute ${showMinimap ? '' : 'left-2'} right-12 bottom-2 z-20 rounded-md border border-border bg-[var(--cg-popover-translucent)] px-2 py-1.5 shadow-sm backdrop-blur-sm`}
      data-codegraphy-state="graph-indexing"
      data-testid="graph-index-status"
      style={showMinimap ? { left: OWNED_GRAPH_MINIMAP_RESERVED_LEFT } : undefined}
    >
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress.phase}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        data-codegraphy-region="graph-index-progress-track"
        data-testid="graph-index-status-track"
        role="progressbar"
        aria-label="Indexing progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${progress.phase} ${percent}%`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          data-codegraphy-region="graph-index-progress-fill"
          data-testid="graph-index-status-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
