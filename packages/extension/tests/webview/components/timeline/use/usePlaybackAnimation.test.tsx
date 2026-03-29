import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createTimelinePlaybackTick, stopTimelinePlayback } = vi.hoisted(() => ({
  createTimelinePlaybackTick: vi.fn(),
  stopTimelinePlayback: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/timeline/cleanup', () => ({
  stopTimelinePlayback,
}));

vi.mock('../../../../../src/webview/components/timeline/playbackTick', () => ({
  createTimelinePlaybackTick,
}));

import { useTimelinePlaybackAnimation } from '../../../../../src/webview/components/timeline/use/playbackAnimation';

function createRefs() {
  return {
    lastFrameTimeRef: { current: 0 },
    lastSentCommitIndexRef: { current: -1 },
    playbackSpeedRef: { current: 1 },
    rafRef: { current: null as number | null },
    startFromTimeRef: { current: null as number | null },
  };
}

const commits = [
  { author: 'Alice', message: 'Initial', parents: [], sha: 'aaa', timestamp: 1000 },
  { author: 'Bob', message: 'Next', parents: ['aaa'], sha: 'bbb', timestamp: 3000 },
];

describe('timeline/usePlaybackAnimation', () => {
  let requestAnimationFrameMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stopTimelinePlayback.mockReset();
    createTimelinePlaybackTick.mockReset();
    requestAnimationFrameMock = vi.fn(() => 41);
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops playback immediately when animation is inactive', () => {
    const refs = createRefs();

    renderHook(() => useTimelinePlaybackAnimation({
      isPlaying: false,
      refs,
      setIsPlaying: vi.fn(),
      setPlaybackTime: vi.fn(),
      timelineCommits: commits,
    }));

    expect(stopTimelinePlayback).toHaveBeenCalledWith(refs.rafRef);
    expect(createTimelinePlaybackTick).not.toHaveBeenCalled();
  });

  it('stops playback when there are no commits to animate', () => {
    const refs = createRefs();

    renderHook(() => useTimelinePlaybackAnimation({
      isPlaying: true,
      refs,
      setIsPlaying: vi.fn(),
      setPlaybackTime: vi.fn(),
      timelineCommits: [],
    }));

    expect(stopTimelinePlayback).toHaveBeenCalledWith(refs.rafRef);
    expect(createTimelinePlaybackTick).not.toHaveBeenCalled();
  });

  it('queues the playback tick and cleans it up on unmount', () => {
    const refs = createRefs();
    const setPlaybackTime = vi.fn();
    const tick = vi.fn();
    refs.startFromTimeRef.current = 2000;
    createTimelinePlaybackTick.mockReturnValue(tick);

    const { unmount } = renderHook(() => useTimelinePlaybackAnimation({
      isPlaying: true,
      refs,
      setIsPlaying: vi.fn(),
      setPlaybackTime,
      timelineCommits: commits,
    }));

    expect(setPlaybackTime).toHaveBeenCalledWith(2000);
    expect(refs.startFromTimeRef.current).toBeNull();
    expect(createTimelinePlaybackTick).toHaveBeenCalledWith({
      maxTimestamp: 3000,
      refs: {
        lastFrameTimeRef: refs.lastFrameTimeRef,
        lastSentCommitIndexRef: refs.lastSentCommitIndexRef,
        playbackSpeedRef: refs.playbackSpeedRef,
        rafRef: refs.rafRef,
      },
      setIsPlaying: expect.any(Function),
      setPlaybackTime,
      timelineCommits: commits,
    });
    expect(requestAnimationFrame).toHaveBeenCalledWith(tick);
    expect(refs.lastFrameTimeRef.current).toBe(0);
    expect(refs.rafRef.current).toBe(41);

    unmount();

    expect(stopTimelinePlayback).toHaveBeenLastCalledWith(refs.rafRef);
  });

  it('does not seed playback time when no deferred start time is queued', () => {
    const refs = createRefs();
    const setPlaybackTime = vi.fn();
    createTimelinePlaybackTick.mockReturnValue(vi.fn());

    const { unmount } = renderHook(() => useTimelinePlaybackAnimation({
      isPlaying: true,
      refs,
      setIsPlaying: vi.fn(),
      setPlaybackTime,
      timelineCommits: commits,
    }));

    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(createTimelinePlaybackTick).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('restarts the animation effect when tracked inputs change', () => {
    const refs = createRefs();
    const setIsPlaying = vi.fn();
    const firstSetPlaybackTime = vi.fn();
    const secondSetPlaybackTime = vi.fn();
    const firstTick = vi.fn();
    const secondTick = vi.fn();
    const nextCommits = [
      ...commits,
      { author: 'Cara', message: 'Final', parents: ['bbb'], sha: 'ccc', timestamp: 5000 },
    ];

    createTimelinePlaybackTick.mockReturnValueOnce(firstTick).mockReturnValueOnce(secondTick);

    const { rerender, unmount } = renderHook(
      ({ setPlaybackTime, timelineCommits }) => useTimelinePlaybackAnimation({
        isPlaying: true,
        refs,
        setIsPlaying,
        setPlaybackTime,
        timelineCommits,
      }),
      {
        initialProps: {
          setPlaybackTime: firstSetPlaybackTime,
          timelineCommits: commits,
        },
      },
    );

    expect(createTimelinePlaybackTick).toHaveBeenCalledTimes(1);

    stopTimelinePlayback.mockClear();
    requestAnimationFrameMock.mockClear();

    rerender({
      setPlaybackTime: secondSetPlaybackTime,
      timelineCommits: nextCommits,
    });

    expect(stopTimelinePlayback).toHaveBeenCalledTimes(1);
    expect(stopTimelinePlayback).toHaveBeenCalledWith(refs.rafRef);
    expect(createTimelinePlaybackTick).toHaveBeenCalledTimes(2);
    expect(createTimelinePlaybackTick).toHaveBeenLastCalledWith({
      maxTimestamp: 5000,
      refs: {
        lastFrameTimeRef: refs.lastFrameTimeRef,
        lastSentCommitIndexRef: refs.lastSentCommitIndexRef,
        playbackSpeedRef: refs.playbackSpeedRef,
        rafRef: refs.rafRef,
      },
      setIsPlaying,
      setPlaybackTime: secondSetPlaybackTime,
      timelineCommits: nextCommits,
    });
    expect(requestAnimationFrameMock).toHaveBeenCalledWith(secondTick);

    unmount();

    expect(stopTimelinePlayback).toHaveBeenCalledTimes(2);
  });
});
