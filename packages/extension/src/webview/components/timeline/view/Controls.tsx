import React from 'react';
import {
  mdiPause,
  mdiPlay,
  mdiSkipBackward,
  mdiSkipNext,
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
  onJumpToEnd: () => void;
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
  onJumpToEnd,
  onJumpToNext,
  onJumpToPrevious,
  onJumpToStart,
  onPlayPause,
}: TimelineControlsProps): React.ReactElement {
  return (
    <div className="mt-2 flex items-center justify-between gap-3" data-testid="timeline-controls">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-sm"
          aria-label="Start"
          disabled={isAtStart}
          onClick={onJumpToStart}
          title="First commit"
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
          <MdiIcon path={mdiSkipNext} size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-sm"
          disabled={isAtEnd}
          aria-label="End"
          onClick={onJumpToEnd}
          title="Latest commit"
        >
          <MdiIcon path={mdiSkipForward} size={16} />
        </Button>
      </div>
      <span className="text-[10px] text-[var(--vscode-descriptionForeground,#777)]">
          {currentDateLabel}
      </span>
    </div>
  );
}
