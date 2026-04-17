import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';
import { useTimelinePlayFromStart } from '../../../../../../src/webview/components/timeline/use/controller/playFromStart';

const commits: ICommitInfo[] = [
  {
    author: 'Alice',
    message: 'Initial commit',
    parents: [],
    sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    timestamp: 1000,
  },
  {
    author: 'Bob',
    message: 'Add feature X',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 2000,
  },
];

describe('timeline/use/controller/playFromStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs playback from the current commit when a reset play is pending', () => {
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const pendingPlayFromStartRef = { current: true } as { current: boolean };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    renderHook(() => useTimelinePlayFromStart({
      currentCommitSha: commits[1].sha,
      lastSentCommitIndexRef,
      pendingPlayFromStartRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    }));

    expect(pendingPlayFromStartRef.current).toBe(false);
    expect(lastSentCommitIndexRef.current).toBe(1);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[1].timestamp);
    expect(setIsPlaying).toHaveBeenCalledWith(true);
  });

  it('does nothing when no reset play is pending or the commit is missing', () => {
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const pendingPlayFromStartRef = { current: false } as { current: boolean };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    renderHook(() => useTimelinePlayFromStart({
      currentCommitSha: 'missing',
      lastSentCommitIndexRef,
      pendingPlayFromStartRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    }));

    expect(lastSentCommitIndexRef.current).toBe(-1);
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(setIsPlaying).not.toHaveBeenCalled();
  });

  it('does nothing when the current commit is valid but playback was not reset', () => {
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const pendingPlayFromStartRef = { current: false } as { current: boolean };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    renderHook(() => useTimelinePlayFromStart({
      currentCommitSha: commits[0].sha,
      lastSentCommitIndexRef,
      pendingPlayFromStartRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    }));

    expect(lastSentCommitIndexRef.current).toBe(-1);
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(setIsPlaying).not.toHaveBeenCalled();
  });

  it('does nothing when the pending play cannot find the current commit', () => {
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const pendingPlayFromStartRef = { current: true } as { current: boolean };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    renderHook(() => useTimelinePlayFromStart({
      currentCommitSha: 'missing',
      lastSentCommitIndexRef,
      pendingPlayFromStartRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    }));

    expect(lastSentCommitIndexRef.current).toBe(-1);
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(setIsPlaying).not.toHaveBeenCalled();
  });

  it('syncs playback when the current commit appears after a rerender', () => {
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const pendingPlayFromStartRef = { current: true } as { current: boolean };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const { rerender } = renderHook(
      ({ currentCommitSha, currentCommits }: { currentCommitSha: string | null; currentCommits: ICommitInfo[] }) =>
        useTimelinePlayFromStart({
          currentCommitSha,
          lastSentCommitIndexRef,
          pendingPlayFromStartRef,
          setIsPlaying,
          setPlaybackTime,
          timelineCommits: currentCommits,
        }),
      {
        initialProps: {
          currentCommitSha: 'missing',
          currentCommits: commits,
        },
      },
    );

    expect(setPlaybackTime).not.toHaveBeenCalled();

    rerender({
      currentCommitSha: commits[0].sha,
      currentCommits: commits,
    });

    expect(lastSentCommitIndexRef.current).toBe(0);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[0].timestamp);
    expect(setIsPlaying).toHaveBeenCalledWith(true);
  });
});
