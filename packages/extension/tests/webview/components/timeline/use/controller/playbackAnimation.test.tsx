import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/contracts';
import { useTimelinePlaybackAnimation } from '../../../../../../src/webview/components/timeline/use/controller/playbackAnimation';

const { createTimelinePlaybackTick, stopTimelinePlayback } = vi.hoisted(() => ({
  createTimelinePlaybackTick: vi.fn(() => vi.fn()),
  stopTimelinePlayback: vi.fn(),
}));

vi.mock('../../../../../../src/webview/components/timeline/playbackTick', () => ({
  createTimelinePlaybackTick,
}));

vi.mock('../../../../../../src/webview/components/timeline/cleanup', () => ({
  stopTimelinePlayback,
}));

function createCommit(timestamp: number): ICommitInfo {
  return {
    author: 'Alice',
    message: 'Commit',
    parents: [],
    sha: `sha-${timestamp}`,
    timestamp,
  };
}

describe('timeline/use/controller/playbackAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 17));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops playback when playback is off', () => {
    const rafRef = { current: 7 } as { current: number | null };

    renderHook(() => useTimelinePlaybackAnimation({
      isPlaying: false,
      refs: {
        lastFrameTimeRef: { current: 0 },
        lastSentCommitIndexRef: { current: -1 },
        playbackSpeedRef: { current: 1 },
        rafRef,
        startFromTimeRef: { current: null },
      },
      setIsPlaying: vi.fn(),
      setPlaybackTime: vi.fn(),
      timelineCommits: [createCommit(1000)],
    }));

    expect(stopTimelinePlayback).toHaveBeenCalledWith(rafRef);
    expect(createTimelinePlaybackTick).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('stops playback when there are no commits', () => {
    const rafRef = { current: 9 } as { current: number | null };

    renderHook(() => useTimelinePlaybackAnimation({
      isPlaying: true,
      refs: {
        lastFrameTimeRef: { current: 0 },
        lastSentCommitIndexRef: { current: -1 },
        playbackSpeedRef: { current: 1 },
        rafRef,
        startFromTimeRef: { current: null },
      },
      setIsPlaying: vi.fn(),
      setPlaybackTime: vi.fn(),
      timelineCommits: [],
    }));

    expect(stopTimelinePlayback).toHaveBeenCalledWith(rafRef);
    expect(createTimelinePlaybackTick).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('schedules ticks without priming playback when there is no pending start time', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const rafRef = { current: null } as { current: number | null };
    const startFromTimeRef = { current: null } as { current: number | null };
    const tick = vi.fn();
    const commits = [createCommit(1000), createCommit(2000)];
    createTimelinePlaybackTick.mockReturnValue(tick);

    renderHook(() => useTimelinePlaybackAnimation({
      isPlaying: true,
      refs: {
        lastFrameTimeRef: { current: 0 },
        lastSentCommitIndexRef: { current: -1 },
        playbackSpeedRef: { current: 2 },
        rafRef,
        startFromTimeRef,
      },
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    }));

    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(startFromTimeRef.current).toBeNull();
    expect(createTimelinePlaybackTick).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTimestamp: 2000,
        timelineCommits: commits,
        refs: expect.objectContaining({
          lastFrameTimeRef: expect.objectContaining({ current: 0 }),
          lastSentCommitIndexRef: expect.objectContaining({ current: -1 }),
          playbackSpeedRef: expect.objectContaining({ current: 2 }),
          rafRef,
        }),
        setIsPlaying,
        setPlaybackTime,
      }),
    );
    expect(requestAnimationFrame).toHaveBeenCalledWith(tick);
  });

  it('primes playback time, reschedules on prop changes, and stops on cleanup', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const rafRef = { current: null } as { current: number | null };
    const startFromTimeRef = { current: 1234 } as { current: number | null };
    const tick = vi.fn();
    const commits = [createCommit(1000), createCommit(2000)];
    createTimelinePlaybackTick.mockReturnValue(tick);

    const { rerender, unmount } = renderHook(
      ({ playbackSpeed, currentCommits }: { playbackSpeed: number; currentCommits: ICommitInfo[] }) =>
        useTimelinePlaybackAnimation({
          isPlaying: true,
          refs: {
            lastFrameTimeRef: { current: 0 },
            lastSentCommitIndexRef: { current: -1 },
            playbackSpeedRef: { current: playbackSpeed },
            rafRef,
            startFromTimeRef,
          },
          setIsPlaying,
          setPlaybackTime,
          timelineCommits: currentCommits,
        }),
      {
        initialProps: { playbackSpeed: 2, currentCommits: commits },
      },
    );

    expect(setPlaybackTime).toHaveBeenCalledWith(1234);
    expect(startFromTimeRef.current).toBeNull();
    expect(createTimelinePlaybackTick).toHaveBeenCalledTimes(1);

    rerender({ playbackSpeed: 3, currentCommits: [...commits, createCommit(3000)] });

    expect(createTimelinePlaybackTick).toHaveBeenCalledTimes(2);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(setPlaybackTime).toHaveBeenCalledTimes(1);

    unmount();

    expect(stopTimelinePlayback).toHaveBeenCalledWith(rafRef);
  });
});
