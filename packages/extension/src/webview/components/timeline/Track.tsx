import React, { useState } from 'react';
import { mdiPause, mdiPlay } from '@mdi/js';
import type { ICommitInfo } from '../../../shared/types';
import { MdiIcon } from '../icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatAxisLabel, formatDate, truncateMessage } from './model';

const TRACK_HEIGHT = 24;

export interface TimelineTrackProps {
  dateTicks: number[];
  indicatorPosition: number;
  isAtEnd: boolean;
  isPlaying: boolean;
  onJumpToEnd: () => void;
  onPlayPause: () => void;
  onTrackMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  setTrackElement: (element: HTMLDivElement | null) => void;
  timelineCommits: ICommitInfo[];
}

export default function Track({
  dateTicks,
  indicatorPosition,
  isAtEnd,
  isPlaying,
  onJumpToEnd,
  onPlayPause,
  onTrackMouseDown,
  setTrackElement,
  timelineCommits,
}: TimelineTrackProps): React.ReactElement {
  const [openTooltipSha, setOpenTooltipSha] = useState<string | null>(null);

  const minTimestamp = timelineCommits[0].timestamp;
  const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
  const timeRange = maxTimestamp - minTimestamp || 1;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex-shrink-0 border-t border-border" data-testid="timeline">
        <div className="flex items-center gap-0 px-3 pt-1.5 pb-0">
          <button
            onClick={onPlayPause}
            className="flex-shrink-0 mr-2 p-0.5 rounded text-[var(--vscode-descriptionForeground,#999)] hover:text-[var(--vscode-foreground,#ccc)] transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
            type="button"
          >
            <MdiIcon path={isPlaying ? mdiPause : mdiPlay} size={16} />
          </button>

          <div
            ref={setTrackElement}
            className="flex-1 relative cursor-pointer select-none rounded-sm"
            data-testid="timeline-track"
            style={{
              height: TRACK_HEIGHT,
              backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
              border: '1px solid var(--vscode-panel-border, #333)',
            }}
            onMouseDown={onTrackMouseDown}
          >
            {timelineCommits.map((commit) => {
              const position = ((commit.timestamp - minTimestamp) / timeRange) * 100;

              return (
                <Tooltip
                  key={commit.sha}
                  open={openTooltipSha === commit.sha}
                  onOpenChange={(open) => {
                    setOpenTooltipSha(open ? commit.sha : null);
                  }}
                >
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-[1px] bottom-[1px] -translate-x-1/2"
                      data-testid="timeline-commit-marker"
                      style={{
                        left: `${position}%`,
                        width: 2,
                        zIndex: 1,
                      }}
                      onMouseEnter={() => setOpenTooltipSha(commit.sha)}
                      onMouseLeave={() => setOpenTooltipSha(null)}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundColor: 'var(--vscode-foreground, #ccc)',
                          opacity: 0.4,
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className="bg-[var(--vscode-editorHoverWidget-background,#2d2d30)] border border-[var(--vscode-editorHoverWidget-border,#454545)] text-[var(--vscode-editorHoverWidget-foreground,#ccc)] px-3 py-2 max-w-xs rounded-md"
                  >
                    <div className="font-mono text-xs text-[var(--vscode-descriptionForeground,#999)] mb-0.5">
                      {commit.sha.slice(0, 7)}
                    </div>
                    <div className="text-sm leading-snug mb-1">
                      {truncateMessage(commit.message, 80)}
                    </div>
                    <div className="text-xs text-[var(--vscode-descriptionForeground,#999)]">
                      {commit.author} &middot; {formatDate(commit.timestamp)}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            <div
              className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none"
              data-testid="timeline-indicator"
              style={{
                left: `${indicatorPosition}%`,
                width: 3,
                zIndex: 20,
              }}
            >
              <div
                className="w-full h-full"
                style={{
                  backgroundColor: 'var(--vscode-focusBorder, #007fd4)',
                }}
              />
            </div>
          </div>

          <button
            onClick={onJumpToEnd}
            disabled={isAtEnd}
            className="flex-shrink-0 ml-2 px-2.5 py-0.5 text-[11px] rounded-[3px] border transition-colors
              border-[var(--vscode-panel-border,#555)] text-[var(--vscode-descriptionForeground,#999)]
              hover:text-[var(--vscode-foreground,#ccc)] hover:border-[var(--vscode-foreground,#999)]
              disabled:opacity-40 disabled:cursor-default disabled:hover:text-[var(--vscode-descriptionForeground,#999)] disabled:hover:border-[var(--vscode-panel-border,#555)]"
            data-testid="timeline-current"
            type="button"
          >
            Current
          </button>
        </div>

        <div className="relative px-3 pb-1.5" style={{ marginLeft: 22 }}>
          <div className="relative h-3.5">
            {dateTicks.map((timestamp) => {
              const position = ((timestamp - minTimestamp) / timeRange) * 100;
              return (
                <span
                  key={timestamp}
                  className="absolute text-[10px] leading-none text-[var(--vscode-descriptionForeground,#777)] -translate-x-1/2 select-none"
                  style={{ left: `${position}%`, top: 2 }}
                >
                  {formatAxisLabel(timestamp)}
                </span>
              );
            })}
            <span
              className="absolute text-[10px] leading-none text-[var(--vscode-descriptionForeground,#777)] select-none"
              style={{ right: 56, top: 2 }}
            >
              Now
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
