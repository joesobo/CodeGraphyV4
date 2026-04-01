import React from 'react';
import { Button } from '../../ui/button';

export interface TimelineControlsProps {
  currentDateLabel: string;
  isAtEnd: boolean;
  isAtStart: boolean;
  isPlaying: boolean;
  onJumpToCurrent: () => void;
  onJumpToNext: () => void;
  onJumpToPrevious: () => void;
  onJumpToStart: () => void;
  onPlayPause: () => void;
}

export default function Controls({
  currentDateLabel,
  isAtEnd,
  isAtStart,
  isPlaying,
  onJumpToCurrent,
  onJumpToNext,
  onJumpToPrevious,
  onJumpToStart,
  onPlayPause,
}: TimelineControlsProps): React.ReactElement {
  return (
    <section className="border-t border-border px-3 py-2" data-testid="timeline-controls">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--vscode-descriptionForeground,#999)]">
          Viewing Date
        </span>
        <span className="text-xs text-[var(--vscode-foreground,#ccc)]">
          {currentDateLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={isAtStart}
          onClick={onJumpToStart}
          title="Reset to start"
        >
          Reset
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isAtStart}
          onClick={onJumpToPrevious}
          title="Previous commit"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isAtEnd}
          onClick={onJumpToNext}
          title="Next commit"
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isAtEnd}
          onClick={onJumpToCurrent}
          title="Jump to current"
        >
          Current
        </Button>
      </div>
    </section>
  );
}
