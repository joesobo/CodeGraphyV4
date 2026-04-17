import React, { useState } from 'react';
import type { ICommitInfo } from '../../../../shared/timeline/contracts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/overlay/tooltip';
import { formatAxisLabel, formatDate } from '../format/dates';
import { truncateMessage } from '../format/messages';

const TRACK_HEIGHT = 20;

export interface TimelineTrackProps {
  dateTicks: number[];
  indicatorPosition: number;
  onTrackMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  setTrackElement: (element: HTMLDivElement | null) => void;
  timelineCommits: ICommitInfo[];
}

export default function Track({
  dateTicks,
  indicatorPosition,
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
      <div className="flex-shrink-0" data-testid="timeline">
        <div
          ref={setTrackElement}
          className="relative cursor-pointer select-none rounded-sm"
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
                      className="h-full w-full"
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
                  <div className="mb-0.5 font-mono text-xs text-[var(--vscode-descriptionForeground,#999)]">
                    {commit.sha.slice(0, 7)}
                  </div>
                  <div className="mb-1 text-sm leading-snug">
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
            className="pointer-events-none absolute top-0 bottom-0 -translate-x-1/2"
            data-testid="timeline-indicator"
            style={{
              left: `${indicatorPosition}%`,
              width: 3,
              zIndex: 20,
            }}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundColor: 'var(--vscode-focusBorder, #007fd4)',
              }}
            />
          </div>
        </div>

        <div className="relative pb-1 pt-1">
          <div className="relative h-3">
            {dateTicks.map((timestamp) => {
              const position = ((timestamp - minTimestamp) / timeRange) * 100;
              return (
                <span
                  key={timestamp}
                  className="absolute -translate-x-1/2 select-none text-[10px] leading-none text-[var(--vscode-descriptionForeground,#777)]"
                  style={{ left: `${position}%`, top: 2 }}
                >
                  {formatAxisLabel(timestamp)}
                </span>
              );
            })}
            <span
              className="absolute select-none text-[10px] leading-none text-[var(--vscode-descriptionForeground,#777)]"
              style={{ right: 0, top: 2 }}
            >
              Now
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
