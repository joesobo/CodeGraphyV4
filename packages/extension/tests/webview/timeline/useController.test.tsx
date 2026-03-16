import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '../../../src/shared/types';
import { useTimelineController } from '../../../src/webview/components/timeline/useController';

const postMessage = vi.fn();

vi.mock('../../../src/webview/lib/vscodeApi', () => ({
  postMessage: (message: unknown) => postMessage(message),
}));

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
  {
    author: 'Alice',
    message: 'Fix bug in feature X',
    parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: 3000,
  },
];

describe('timeline/useController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    postMessage.mockReset();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns empty controller state when no commits are available', () => {
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: null,
      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying: vi.fn(),
      timelineCommits: [],
    }));

    expect(result.current.dateTicks).toEqual([]);
    expect(result.current.indicatorPosition).toBe(0);
    expect(result.current.isAtEnd).toBe(false);
  });

  it('restarts from the first commit when playback resumes at the end', () => {
    const setIsPlaying = vi.fn();
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[2].sha,
      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying,
      timelineCommits: commits,
    }));

    act(() => {
      result.current.handlePlayPause();
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[0].sha },
    });
    expect(setIsPlaying).toHaveBeenCalledWith(true);
  });

  it('jumps to the latest commit and stops playback when requested', () => {
    const setIsPlaying = vi.fn();
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[0].sha,
      isPlaying: true,
      playbackSpeed: 1,
      setIsPlaying,
      timelineCommits: commits,
    }));

    act(() => {
      result.current.handleJumpToEnd();
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[2].sha },
    });
  });

  it('debounces track scrubbing before jumping to the matched commit', () => {
    const setIsPlaying = vi.fn();
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[0].sha,
      isPlaying: true,
      playbackSpeed: 1,
      setIsPlaying,
      timelineCommits: commits,
    }));
    const track = document.createElement('div');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 24,
      height: 24,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    act(() => {
      result.current.setTrackElement(track);
    });

    act(() => {
      result.current.handleTrackMouseDown({
        clientX: 150,
      } as Parameters<typeof result.current.handleTrackMouseDown>[0]);
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(postMessage).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[1].sha },
    });
  });
});
