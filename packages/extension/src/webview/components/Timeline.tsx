import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../store';
import { postMessage } from '../lib/vscodeApi';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { mdiClockOutline, mdiRefresh, mdiPause, mdiPlay } from '@mdi/js';
import { MdiIcon } from './icons';

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

/**
 * Find the index of the last commit whose timestamp <= the given time.
 * Returns -1 if time is before all commits.
 */
function findCommitIndexAtTime(commits: { timestamp: number }[], time: number): number {
  let lo = 0;
  let hi = commits.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (commits[mid].timestamp <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

const TRACK_HEIGHT = 24;

/** Playback rate: at speed=1, 1 real second = 2 days of repo time */
const SECONDS_PER_DAY = 172800;

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

  // Smooth playback state
  // playbackTime is a unix timestamp representing the current position in repo time.
  // During playback it advances smoothly; when stopped it tracks the current commit.
  const [playbackTime, setPlaybackTime] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastSentCommitIndexRef = useRef<number>(-1);
  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  // Current commit index (discrete, based on currentCommitSha from store)
  const currentIndex = useMemo(() => {
    if (!currentCommitSha || timelineCommits.length === 0) return 0;
    const idx = timelineCommits.findIndex((c) => c.sha === currentCommitSha);
    return idx >= 0 ? idx : 0;
  }, [currentCommitSha, timelineCommits]);

  const isAtEnd = currentIndex === timelineCommits.length - 1;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Webview-driven playback via requestAnimationFrame ──────────────────

  useEffect(() => {
    if (!isPlaying || timelineCommits.length === 0) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // If a start-from time was set (e.g., restarting from end), apply it
    if (startFromTimeRef.current !== null) {
      setPlaybackTime(startFromTimeRef.current);
      startFromTimeRef.current = null;
    }

    const maxTs = timelineCommits[timelineCommits.length - 1].timestamp;

    const tick = (now: number) => {
      const delta = lastFrameTimeRef.current > 0 ? now - lastFrameTimeRef.current : 0;
      lastFrameTimeRef.current = now;

      setPlaybackTime((prev) => {
        if (prev === null) return prev;

        // Advance: deltaMs (real) * speed * (seconds-per-day / 1000ms)
        const newTime = prev + (delta / 1000) * playbackSpeedRef.current * SECONDS_PER_DAY;

        // Check if we've crossed any new commit boundaries
        const commitIdx = findCommitIndexAtTime(timelineCommits, newTime);
        if (commitIdx > lastSentCommitIndexRef.current && commitIdx >= 0) {
          lastSentCommitIndexRef.current = commitIdx;
          const commit = timelineCommits[commitIdx];
          postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: commit.sha } });
        }

        // Reached the end
        if (newTime >= maxTs) {
          setIsPlaying(false);
          return maxTs;
        }

        return newTime;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    lastFrameTimeRef.current = 0; // Reset so first frame has delta=0
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, timelineCommits, setIsPlaying]);

  // Track whether the user is actively scrubbing (to prevent sync effect from overwriting)
  const userScrubActiveRef = useRef(false);

  // Sync playbackTime to currentCommitSha when not playing and not scrubbing
  useEffect(() => {
    if (isPlaying) return;
    if (userScrubActiveRef.current) return;
    if (!currentCommitSha || timelineCommits.length === 0) return;
    const commit = timelineCommits.find((c) => c.sha === currentCommitSha);
    if (commit) {
      setPlaybackTime(commit.timestamp);
      lastSentCommitIndexRef.current = timelineCommits.indexOf(commit);
    }
  }, [currentCommitSha, timelineCommits, isPlaying]);

  // Jump to any point on the timeline track (not just nearest commit)
  const scrubResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpToPositionOnTrack = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || timelineCommits.length === 0) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

      const minTs = timelineCommits[0].timestamp;
      const maxTs = timelineCommits[timelineCommits.length - 1].timestamp;
      const targetTs = minTs + ratio * (maxTs - minTs);

      // Mark scrub active to prevent sync effect from overwriting position
      userScrubActiveRef.current = true;
      if (scrubResetTimerRef.current) clearTimeout(scrubResetTimerRef.current);

      // Set indicator to exact time position
      setPlaybackTime(targetTs);

      // Find last commit whose timestamp <= targetTs
      const commitIdx = findCommitIndexAtTime(timelineCommits, targetTs);
      const effectiveIdx = Math.max(0, commitIdx);
      lastSentCommitIndexRef.current = effectiveIdx;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: timelineCommits[effectiveIdx].sha } });
        // Clear scrub guard after response has time to arrive
        scrubResetTimerRef.current = setTimeout(() => {
          userScrubActiveRef.current = false;
        }, 200);
      }, 50);
    },
    [timelineCommits],
  );

  // Mouse handlers for scrubbing on the timeline track
  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Stop playback when scrubbing
      if (isPlaying) {
        setIsPlaying(false);
      }
      isDraggingRef.current = true;
      jumpToPositionOnTrack(e.clientX);
    },
    [jumpToPositionOnTrack, isPlaying, setIsPlaying],
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

  // Ref to signal the playback effect to start from a specific time
  const startFromTimeRef = useRef<number | null>(null);

  // Play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // If at the end, jump to start first
      if (isAtEnd && timelineCommits.length > 0) {
        const firstCommit = timelineCommits[0];
        lastSentCommitIndexRef.current = -1;
        postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: firstCommit.sha } });
        // Store start time in ref so the playback effect picks it up
        startFromTimeRef.current = firstCommit.timestamp;
        setPlaybackTime(firstCommit.timestamp);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, isAtEnd, timelineCommits, setIsPlaying]);

  // Jump to latest commit (also stops playback)
  const handleJumpToEnd = useCallback(() => {
    if (timelineCommits.length === 0) return;
    if (isPlaying) {
      setIsPlaying(false);
    }
    const lastCommit = timelineCommits[timelineCommits.length - 1];
    setPlaybackTime(lastCommit.timestamp);
    lastSentCommitIndexRef.current = timelineCommits.length - 1;
    postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: lastCommit.sha } });
  }, [timelineCommits, isPlaying, setIsPlaying]);

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
          <MdiIcon path={mdiClockOutline} size={16} className="mr-1" />
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
          <MdiIcon path={mdiRefresh} size={16} className="animate-spin text-muted-foreground" />
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
          <MdiIcon path={mdiRefresh} size={16} className="animate-spin text-muted-foreground" />
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

  // Indicator position: smooth playbackTime when available, else current commit's timestamp
  const indicatorTime = playbackTime ?? (
    currentCommitSha
      ? (timelineCommits.find((c) => c.sha === currentCommitSha)?.timestamp ?? minTimestamp)
      : minTimestamp
  );
  const indicatorPosition = Math.max(0, Math.min(100, ((indicatorTime - minTimestamp) / timeRange) * 100));

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
              <MdiIcon path={mdiPause} size={16} />
            ) : (
              <MdiIcon path={mdiPlay} size={16} />
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
            {/* Commit lines (all uniform — the indicator is separate) */}
            {timelineCommits.map((commit) => {
              const position = ((commit.timestamp - minTimestamp) / timeRange) * 100;

              return (
                <Tooltip key={commit.sha} open={openTooltipSha === commit.sha} onOpenChange={(open) => {
                  setOpenTooltipSha(open ? commit.sha : null);
                }}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-[1px] bottom-[1px] -translate-x-1/2"
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

            {/* Smooth playback indicator — separate from commit lines */}
            <div
              className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none"
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
