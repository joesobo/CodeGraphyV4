import React from 'react';
import {
  mdiPause,
  mdiPlay,
  mdiSkipBackward,
  mdiSkipForward,
  mdiSkipPrevious,
} from '@mdi/js';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';

export interface TimelineControlsProps {
  currentDateLabel: string;
  isAtEnd: boolean;
  isAtStart: boolean;
  isPlaying: boolean;
  onReset: () => void;
  onJumpToCurrent: () => void;
  onJumpToNext: () => void;
  onJumpToPrevious: () => void;
  onPlayPause: () => void;
}

export default function Controls({
  currentDateLabel,
  isAtEnd,
  isAtStart,
  isPlaying,
  onReset,
  onJumpToCurrent,
  onJumpToNext,
  onJumpToPrevious,
  onPlayPause,
}: TimelineControlsProps): React.ReactElement {
  return (
    <div className="mt-2 flex items-center justify-between gap-3" data-testid="timeline-controls">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-sm"
          aria-label="Reset"
          disabled={isAtStart}
          onClick={onReset}
          title="Reset to first graph commit"
        >
          <MdiIcon path={mdiSkipBackward} size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-sm"
          aria-label="Prev"
          disabled={isAtStart}
          onClick={onJumpToPrevious}
          title="Previous commit"
        >
          <MdiIcon path={mdiSkipPrevious} size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-sm"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          <MdiIcon path={isPlaying ? mdiPause : mdiPlay} size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-sm"
          aria-label="Next"
          disabled={isAtEnd}
          onClick={onJumpToNext}
          title="Next commit"
        >
          <MdiIcon path={mdiSkipForward} size={16} />
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
      <span className="text-[10px] text-[var(--vscode-descriptionForeground,#777)]">
          {currentDateLabel}
      </span>
    </div>
  );
}
