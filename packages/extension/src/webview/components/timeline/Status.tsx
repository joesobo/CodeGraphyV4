import React from 'react';
import { mdiClockOutline, mdiRefresh } from '@mdi/js';
import { MdiIcon } from '../icons';
import { Button } from '../ui/button';

export interface TimelineStatusProgress {
  phase: string;
  current: number;
  total: number;
}

export interface TimelineStatusProps {
  hasGraphData: boolean;
  isIndexing: boolean;
  indexProgress: TimelineStatusProgress | null;
  onIndexRepo: () => void;
}

export default function Status({
  hasGraphData,
  isIndexing,
  indexProgress,
  onIndexRepo,
}: TimelineStatusProps): React.ReactElement | null {
  if (isIndexing && indexProgress) {
    const progressPercent =
      indexProgress.total > 0 ? Math.round((indexProgress.current / indexProgress.total) * 100) : 0;

    return (
      <div className="flex-shrink-0 border-t border-border p-3" data-testid="timeline-status">
        <div className="flex items-center gap-2 mb-1">
          <MdiIcon path={mdiRefresh} size={16} className="animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {indexProgress.phase} ({indexProgress.current}/{indexProgress.total})
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden bg-muted"
          data-testid="timeline-status-progress-track"
        >
          <div
            className="h-full rounded-full transition-all duration-200 bg-primary"
            data-testid="timeline-status-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  if (isIndexing) {
    return (
      <div className="flex-shrink-0 border-t border-border p-3" data-testid="timeline-status">
        <div className="flex items-center gap-2">
          <MdiIcon path={mdiRefresh} size={16} className="animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Indexing repository...</span>
        </div>
      </div>
    );
  }

  if (!hasGraphData) {
    return null;
  }

  return (
    <div
      className="flex-shrink-0 border-t border-border p-2 flex items-center justify-center"
      data-testid="timeline-status"
    >
      <Button variant="outline" size="sm" onClick={onIndexRepo} title="Index repository git history">
        <MdiIcon path={mdiClockOutline} size={16} className="mr-1" />
        Index Repo
      </Button>
    </div>
  );
}
