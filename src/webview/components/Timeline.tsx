import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../store';
import { postMessage } from '../lib/vscodeApi';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/**
 * Format a Unix timestamp as "Mon D, YYYY".
 */
function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format a Unix timestamp as abbreviated month + day label for the axis.
 */
function formatAxisLabel(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Truncate a commit message to a given max length.
 */
function truncateMessage(message: string, maxLen: number = 50): string {
  if (message.length <= maxLen) return message;
  return message.slice(0, maxLen - 3) + '...';
}

/**
 * Generate evenly-spaced date tick marks for the timeline axis.
 */
function generateDateTicks(minTs: number, maxTs: number, maxTicks: number = 7): number[] {
  const range = maxTs - minTs;
  if (range <= 0) return [minTs];

  const step = range / (maxTicks + 1);
  const ticks: number[] = [];
  for (let i = 1; i <= maxTicks; i++) {
    ticks.push(minTs + step * i);
  }
  return ticks;
}

const TRACK_HEIGHT = 24;

export default function Timeline(): React.ReactElement | null {
  const timelineActive = useGraphStore((s) => s.timelineActive);
  const timelineCommits = useGraphStore((s) => s.timelineCommits);
  const currentCommitSha = useGraphStore((s) => s.currentCommitSha);
  const isIndexing = useGraphStore((s) => s.isIndexing);
  const indexProgress = useGraphStore((s) => s.indexProgress);
  const isPlaying = useGraphStore((s) => s.isPlaying);
  const playbackSpeed = useGraphStore((s) => s.playbackSpeed);
  const graphData = useGraphStore((s) => s.graphData);

  const setIsPlaying = useGraphStore((s) => s.setIsPlaying);

  const trackRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);

  const [openTooltipSha, setOpenTooltipSha] = useState<string | null>(null);

  // Current commit index
  const currentIndex = useMemo(() => {
    if (!currentCommitSha || timelineCommits.length === 0) return 0;
    const idx = timelineCommits.findIndex((c) => c.sha === currentCommitSha);
    return idx >= 0 ? idx : 0;
  }, [currentCommitSha, timelineCommits]);

  const isAtEnd = currentIndex === timelineCommits.length - 1;

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Jump to commit by finding nearest commit to a click position on the track
  const jumpToPositionOnTrack = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || timelineCommits.length === 0) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

      const minTs = timelineCommits[0].timestamp;
      const maxTs = timelineCommits[timelineCommits.length - 1].timestamp;
      const targetTs = minTs + ratio * (maxTs - minTs);

      // Find nearest commit by timestamp
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < timelineCommits.length; i++) {
        const dist = Math.abs(timelineCommits[i].timestamp - targetTs);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const commit = timelineCommits[nearestIdx];
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: commit.sha } });
      }, 50);
    },
    [timelineCommits],
  );

  // Mouse handlers for scrubbing on the timeline track
  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      jumpToPositionOnTrack(e.clientX);
    },
    [jumpToPositionOnTrack],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        jumpToPositionOnTrack(e.clientX);
      }
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [jumpToPositionOnTrack]);

  // Play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      postMessage({ type: 'PAUSE_TIMELINE' });
    } else {
      setIsPlaying(true);
      postMessage({ type: 'PLAY_TIMELINE', payload: { speed: playbackSpeed } });
    }
  }, [isPlaying, playbackSpeed, setIsPlaying]);

  // Jump to latest commit
  const handleJumpToEnd = useCallback(() => {
    if (timelineCommits.length === 0) return;
    const lastCommit = timelineCommits[timelineCommits.length - 1];
    postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: lastCommit.sha } });
  }, [timelineCommits]);

  // Index repo
  const handleIndexRepo = useCallback(() => {
    postMessage({ type: 'INDEX_REPO' });
  }, []);

  // State 1: No timeline, not indexing
  if (!timelineActive && !isIndexing) {
    if (!graphData) return null;

    return (
      <div className="flex-shrink-0 border-t border-border p-2 flex items-center justify-center">
        <Button variant="outline" size="sm" onClick={handleIndexRepo} title="Index repository git history">
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Index Repo
        </Button>
      </div>
    );
  }

  // State 2: Indexing in progress
  if (isIndexing && indexProgress) {
    const progressPercent =
      indexProgress.total > 0 ? Math.round((indexProgress.current / indexProgress.total) * 100) : 0;

    return (
      <div className="flex-shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2 mb-1">
          <svg className="h-4 w-4 animate-spin text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-xs text-muted-foreground">
            {indexProgress.phase} ({indexProgress.current}/{indexProgress.total})
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
          <div
            className="h-full rounded-full transition-all duration-200 bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // State 2b: Indexing but no progress data yet
  if (isIndexing) {
    return (
      <div className="flex-shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-xs text-muted-foreground">Indexing repository...</span>
        </div>
      </div>
    );
  }

  // State 3: Timeline ready
  if (!timelineActive || timelineCommits.length === 0) return null;

  const minTimestamp = timelineCommits[0].timestamp;
  const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
  const timeRange = maxTimestamp - minTimestamp || 1;
  const dateTicks = generateDateTicks(minTimestamp, maxTimestamp);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex-shrink-0 border-t border-border" data-testid="timeline">
        {/* Main timeline row: play/pause | track | current button */}
        <div className="flex items-center gap-0 px-3 pt-1.5 pb-0">
          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            className="flex-shrink-0 mr-2 p-0.5 rounded text-[var(--vscode-descriptionForeground,#999)] hover:text-[var(--vscode-foreground,#ccc)] transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="3" width="6" height="18" />
                <rect x="14" y="3" width="6" height="18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Timeline track */}
          <div
            ref={trackRef}
            className="flex-1 relative cursor-pointer select-none rounded-sm"
            style={{
              height: TRACK_HEIGHT,
              backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
              border: '1px solid var(--vscode-panel-border, #333)',
            }}
            onMouseDown={handleTrackMouseDown}
          >
            {/* Commit lines */}
            {timelineCommits.map((commit) => {
              const position = ((commit.timestamp - minTimestamp) / timeRange) * 100;
              const isCurrent = commit.sha === currentCommitSha;

              return (
                <Tooltip key={commit.sha} open={openTooltipSha === commit.sha} onOpenChange={(open) => {
                  setOpenTooltipSha(open ? commit.sha : null);
                }}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-[1px] bottom-[1px] -translate-x-1/2"
                      style={{
                        left: `${position}%`,
                        width: isCurrent ? 4 : 2,
                        zIndex: isCurrent ? 10 : 1,
                      }}
                      onMouseEnter={() => setOpenTooltipSha(commit.sha)}
                      onMouseLeave={() => setOpenTooltipSha(null)}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundColor: isCurrent
                            ? 'var(--vscode-focusBorder, #007fd4)'
                            : 'var(--vscode-foreground, #ccc)',
                          opacity: isCurrent ? 1 : 0.4,
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
          </div>

          {/* Current button — pill shape */}
          <button
            onClick={handleJumpToEnd}
            disabled={isAtEnd}
            className="flex-shrink-0 ml-2 px-2.5 py-0.5 text-[11px] rounded-[3px] border transition-colors
              border-[var(--vscode-panel-border,#555)] text-[var(--vscode-descriptionForeground,#999)]
              hover:text-[var(--vscode-foreground,#ccc)] hover:border-[var(--vscode-foreground,#999)]
              disabled:opacity-40 disabled:cursor-default disabled:hover:text-[var(--vscode-descriptionForeground,#999)] disabled:hover:border-[var(--vscode-panel-border,#555)]"
          >
            Current
          </button>
        </div>

        {/* Date axis labels — tight below the track */}
        <div className="relative px-3 pb-1.5" style={{ marginLeft: 22 }}>
          <div className="relative h-3.5">
            {dateTicks.map((ts, i) => {
              const position = ((ts - minTimestamp) / timeRange) * 100;
              return (
                <span
                  key={i}
                  className="absolute text-[10px] leading-none text-[var(--vscode-descriptionForeground,#777)] -translate-x-1/2 select-none"
                  style={{ left: `${position}%`, top: 2 }}
                >
                  {formatAxisLabel(ts)}
                </span>
              );
            })}
            {/* "Now" label at end */}
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
