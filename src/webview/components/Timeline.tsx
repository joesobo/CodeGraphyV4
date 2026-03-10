import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../store';
import { postMessage } from '../lib/vscodeApi';
import { Button } from './ui/button';
import type { ICommitInfo } from '../../shared/types';

/**
 * Format a Unix timestamp (seconds) as a short date string.
 */
function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format a Unix timestamp (seconds) as a full date+time string.
 */
function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate a commit message to a given max length.
 */
function truncateMessage(message: string, maxLen: number = 60): string {
  if (message.length <= maxLen) return message;
  return message.slice(0, maxLen - 3) + '...';
}

const SPEED_OPTIONS = [0.5, 1, 2, 5];

/**
 * Timeline component rendered below the graph canvas.
 * Shows a horizontal commit timeline with playback controls.
 */
export default function Timeline(): React.ReactElement | null {
  const timelineActive = useGraphStore((s) => s.timelineActive);
  const timelineCommits = useGraphStore((s) => s.timelineCommits);
  const currentCommitSha = useGraphStore((s) => s.currentCommitSha);
  const isIndexing = useGraphStore((s) => s.isIndexing);
  const indexProgress = useGraphStore((s) => s.indexProgress);
  const isPlaying = useGraphStore((s) => s.isPlaying);
  const playbackSpeed = useGraphStore((s) => s.playbackSpeed);
  const graphData = useGraphStore((s) => s.graphData);

  const setPlaybackSpeed = useGraphStore((s) => s.setPlaybackSpeed);
  const setIsPlaying = useGraphStore((s) => s.setIsPlaying);

  const [hoveredCommit, setHoveredCommit] = useState<ICommitInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current commit index in the commits array
  const currentIndex = useMemo(() => {
    if (!currentCommitSha || timelineCommits.length === 0) return 0;
    const idx = timelineCommits.findIndex((c) => c.sha === currentCommitSha);
    return idx >= 0 ? idx : 0;
  }, [currentCommitSha, timelineCommits]);

  // Current commit info
  const currentCommit = useMemo(() => {
    if (timelineCommits.length === 0) return null;
    return timelineCommits[currentIndex] ?? null;
  }, [timelineCommits, currentIndex]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle slider change with debounce
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = parseInt(e.target.value, 10);
      const commit = timelineCommits[idx];
      if (!commit) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        postMessage({ type: 'JUMP_TO_COMMIT', payload: { sha: commit.sha } });
      }, 100);
    },
    [timelineCommits],
  );

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      postMessage({ type: 'PAUSE_TIMELINE' });
    } else {
      setIsPlaying(true);
      postMessage({ type: 'PLAY_TIMELINE', payload: { speed: playbackSpeed } });
    }
  }, [isPlaying, playbackSpeed, setIsPlaying]);

  // Handle speed change
  const handleSpeedChange = useCallback(
    (speed: number) => {
      setPlaybackSpeed(speed);
      if (isPlaying) {
        // Re-send play with new speed
        postMessage({ type: 'PLAY_TIMELINE', payload: { speed } });
      }
    },
    [isPlaying, setPlaybackSpeed],
  );

  // Handle refresh (re-index)
  const handleRefresh = useCallback(() => {
    postMessage({ type: 'INDEX_REPO' });
  }, []);

  // Handle index repo
  const handleIndexRepo = useCallback(() => {
    postMessage({ type: 'INDEX_REPO' });
  }, []);

  // Commit dot hover handlers
  const handleDotMouseEnter = useCallback(
    (commit: ICommitInfo, e: React.MouseEvent) => {
      setHoveredCommit(commit);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleDotMouseLeave = useCallback(() => {
    setHoveredCommit(null);
  }, []);

  // State 1: No timeline, not indexing - show nothing or "Index Repo" button
  if (!timelineActive && !isIndexing) {
    // Only show the "Index Repo" button if there's graph data loaded
    if (!graphData) return null;

    return (
      <div className="flex-shrink-0 border-t border-[var(--vscode-panel-border,#3c3c3c)] p-2 flex items-center justify-center">
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
      <div className="flex-shrink-0 border-t border-[var(--vscode-panel-border,#3c3c3c)] p-3">
        <div className="flex items-center gap-2 mb-1">
          <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-xs text-[var(--vscode-descriptionForeground,#999)]">
            {indexProgress.phase} ({indexProgress.current}/{indexProgress.total})
          </span>
        </div>
        <div className="w-full h-1.5 bg-[var(--vscode-progressBar-background,#333)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--vscode-progressBar-background,#0078d4)] rounded-full transition-all duration-200"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: 'var(--vscode-progressBar-background, #0078d4)',
            }}
          />
        </div>
      </div>
    );
  }

  // State 2 (indexing but no progress data yet)
  if (isIndexing) {
    return (
      <div className="flex-shrink-0 border-t border-[var(--vscode-panel-border,#3c3c3c)] p-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-xs text-[var(--vscode-descriptionForeground,#999)]">Indexing repository...</span>
        </div>
      </div>
    );
  }

  // State 3: Timeline ready
  if (!timelineActive || timelineCommits.length === 0) return null;

  const minTimestamp = timelineCommits[0].timestamp;
  const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
  const timeRange = maxTimestamp - minTimestamp || 1;

  return (
    <div className="flex-shrink-0 border-t border-[var(--vscode-panel-border,#3c3c3c)] p-2" data-testid="timeline">
      {/* Current commit info */}
      {currentCommit && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs font-mono text-[var(--vscode-descriptionForeground,#999)]">
            {currentCommit.sha.slice(0, 7)}
          </span>
          <span className="text-xs text-[var(--vscode-foreground,#ccc)] truncate flex-1">
            {truncateMessage(currentCommit.message)}
          </span>
          <span className="text-xs text-[var(--vscode-descriptionForeground,#999)] flex-shrink-0">
            {formatDate(currentCommit.timestamp)}
          </span>
        </div>
      )}

      {/* Timeline track with dots */}
      <div className="relative h-6 mx-1 mb-1">
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--vscode-panel-border,#555)] -translate-y-1/2" />

        {/* Commit dots */}
        {timelineCommits.map((commit) => {
          const position = ((commit.timestamp - minTimestamp) / timeRange) * 100;
          const isCurrent = commit.sha === currentCommitSha;

          return (
            <div
              key={commit.sha}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${position}%` }}
              onMouseEnter={(e) => handleDotMouseEnter(commit, e)}
              onMouseLeave={handleDotMouseLeave}
            >
              <div
                className={`rounded-full transition-all ${
                  isCurrent
                    ? 'w-2.5 h-2.5 bg-[var(--vscode-focusBorder,#007fd4)]'
                    : 'w-1.5 h-1.5 bg-[var(--vscode-descriptionForeground,#888)] hover:bg-[var(--vscode-foreground,#ccc)] hover:w-2 hover:h-2'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Slider */}
      <div className="px-1 mb-2">
        <input
          type="range"
          min={0}
          max={timelineCommits.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-1 appearance-none cursor-pointer rounded-full
            bg-[var(--vscode-panel-border,#555)]
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[var(--vscode-focusBorder,#007fd4)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[var(--vscode-focusBorder,#007fd4)]
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
          data-testid="timeline-slider"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-1">
        {/* Play/Pause */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </Button>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-[var(--vscode-focusBorder,#007fd4)] text-white'
                  : 'text-[var(--vscode-descriptionForeground,#999)] hover:text-[var(--vscode-foreground,#ccc)]'
              }`}
              title={`${speed}x speed`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh button */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} title="Re-index repository">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20v-6h-6" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 10A8 8 0 0010 4M4 14a8 8 0 0010 6"
            />
          </svg>
        </Button>
      </div>

      {/* Tooltip */}
      {hoveredCommit && (
        <div
          className="fixed z-50 px-2 py-1.5 rounded shadow-lg text-xs
            bg-[var(--vscode-editorHoverWidget-background,#2d2d30)]
            border border-[var(--vscode-editorHoverWidget-border,#454545)]
            text-[var(--vscode-editorHoverWidget-foreground,#ccc)]
            pointer-events-none"
          style={{
            left: tooltipPos.x + 8,
            top: tooltipPos.y - 60,
          }}
        >
          <div className="font-medium mb-0.5">{truncateMessage(hoveredCommit.message, 80)}</div>
          <div className="text-[var(--vscode-descriptionForeground,#999)]">
            {hoveredCommit.author} &middot; {formatDateTime(hoveredCommit.timestamp)}
          </div>
          <div className="font-mono text-[var(--vscode-descriptionForeground,#999)]">
            {hoveredCommit.sha.slice(0, 7)}
          </div>
        </div>
      )}
    </div>
  );
}
