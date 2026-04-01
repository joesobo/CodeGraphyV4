import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';
import { clearSentMessages, findMessage } from '../../../../helpers/sentMessages';
import * as dragListenersModule from '../../../../../src/webview/components/timeline/dragListeners';
import * as playbackAnimationModule from '../../../../../src/webview/components/timeline/use/playbackAnimation';
import * as commitSyncModule from '../../../../../src/webview/components/timeline/use/commitSync';
import * as scrubPositionModule from '../../../../../src/webview/components/timeline/scrubPosition';
import { useTimelineController } from '../../../../../src/webview/components/timeline/use/controller';

vi.mock('../../../../../src/webview/components/timeline/dragListeners', async () => {
  const actual = await vi.importActual<typeof import('../../../../../src/webview/components/timeline/dragListeners')>(
    '../../../../../src/webview/components/timeline/dragListeners',
  );

  return {
    ...actual,
    bindTimelineDragListeners: vi.fn(actual.bindTimelineDragListeners),
  };
});

vi.mock('../../../../../src/webview/components/timeline/use/playbackAnimation', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../src/webview/components/timeline/use/playbackAnimation')
  >('../../../../../src/webview/components/timeline/use/playbackAnimation');

  return {
    ...actual,
    useTimelinePlaybackAnimation: vi.fn(actual.useTimelinePlaybackAnimation),
  };
});

vi.mock('../../../../../src/webview/components/timeline/use/commitSync', async () => {
  const actual = await vi.importActual<typeof import('../../../../../src/webview/components/timeline/use/commitSync')>(
    '../../../../../src/webview/components/timeline/use/commitSync',
  );

  return {
    ...actual,
    useTimelineCommitSync: vi.fn(actual.useTimelineCommitSync),
  };
});

vi.mock('../../../../../src/webview/components/timeline/scrubPosition', async () => {
  const actual = await vi.importActual<typeof import('../../../../../src/webview/components/timeline/scrubPosition')>(
    '../../../../../src/webview/components/timeline/scrubPosition',
  );

  return {
    ...actual,
    jumpToTrackPosition: vi.fn(actual.jumpToTrackPosition),
  };
});

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

function createTrack(width: number = 300): HTMLDivElement {
  const track = document.createElement('div');
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    bottom: 24,
    height: 24,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return track;
}

function expectJumpToCommit(sha: string): void {
  expect(findMessage('JUMP_TO_COMMIT')).toEqual({
    type: 'JUMP_TO_COMMIT',
    payload: { sha },
  });
}

describe('timeline/useController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    clearSentMessages();
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

  it('binds drag listeners with an initially idle dragging ref', () => {
    renderHook(() => useTimelineController({
      currentCommitSha: commits[0].sha,
      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying: vi.fn(),
      timelineCommits: commits,
    }));

    expect(dragListenersModule.bindTimelineDragListeners).toHaveBeenCalledWith(
      expect.objectContaining({
        isDraggingRef: expect.objectContaining({ current: false }),
        onDrag: expect.any(Function),
      }),
    );
  });

  it('passes clean initial refs into the commit sync and playback hooks', () => {
    renderHook(() => useTimelineController({
      currentCommitSha: null,
      isPlaying: false,
      playbackSpeed: 2.5,
      setIsPlaying: vi.fn(),
      timelineCommits: commits,
    }));

    expect(commitSyncModule.useTimelineCommitSync).toHaveBeenCalledWith(
      expect.objectContaining({
        userScrubActiveRef: expect.objectContaining({ current: false }),
      }),
    );
    expect(playbackAnimationModule.useTimelinePlaybackAnimation).toHaveBeenCalledWith(
      expect.objectContaining({
        refs: expect.objectContaining({
          playbackSpeedRef: expect.objectContaining({ current: 2.5 }),
          startFromTimeRef: expect.objectContaining({ current: null }),
        }),
      }),
    );
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

    expectJumpToCommit(commits[0].sha);
    expect(setIsPlaying).toHaveBeenCalledWith(true);
  });

  it('stores a start-from timestamp when play resumes from the end after a rerender', () => {
    const setIsPlaying = vi.fn();
    const { result, rerender } = renderHook(
      (props: { currentCommitSha: string | null }) => useTimelineController({
        currentCommitSha: props.currentCommitSha,
        isPlaying: false,
        playbackSpeed: 1,
        setIsPlaying,
        timelineCommits: commits,
      }),
      {
        initialProps: { currentCommitSha: commits[0].sha },
      },
    );

    rerender({ currentCommitSha: commits[2].sha });

    act(() => {
      result.current.handlePlayPause();
    });

    const playbackOptions = vi.mocked(playbackAnimationModule.useTimelinePlaybackAnimation).mock.calls.at(-1)?.[0];

    expectJumpToCommit(commits[0].sha);
    expect(playbackOptions?.refs.startFromTimeRef.current).toBe(commits[0].timestamp);
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
    expectJumpToCommit(commits[2].sha);
  });

  it('jumps to the first commit and stops playback when requested', () => {
    const setIsPlaying = vi.fn();
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[2].sha,
      isPlaying: true,
      playbackSpeed: 1,
      setIsPlaying,
      timelineCommits: commits,
    }));

    act(() => {
      result.current.handleJumpToStart();
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expectJumpToCommit(commits[0].sha);
  });

  it('updates the jump-to-end handler when playback state and commits change', () => {
    const setIsPlaying = vi.fn();
    const extendedCommits = [
      ...commits,
      {
        author: 'Cara',
        message: 'Ship release',
        parents: [commits[2].sha],
        sha: 'ddd444ddd444ddd444ddd444ddd444ddd444ddd4',
        timestamp: 4000,
      },
    ];
    const { result, rerender } = renderHook(
      (props: { isPlaying: boolean; timelineCommits: ICommitInfo[] }) => useTimelineController({
        currentCommitSha: props.timelineCommits[0]?.sha ?? null,
        isPlaying: props.isPlaying,
        playbackSpeed: 1,
        setIsPlaying,
        timelineCommits: props.timelineCommits,
      }),
      {
        initialProps: { isPlaying: false, timelineCommits: commits },
      },
    );

    rerender({ isPlaying: true, timelineCommits: extendedCommits });

    act(() => {
      result.current.handleJumpToEnd();
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expectJumpToCommit(extendedCommits[3].sha);
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
    const track = createTrack();
    act(() => {
      result.current.setTrackElement(track);
    });

    act(() => {
      result.current.handleTrackMouseDown({
        clientX: 150,
      } as Parameters<typeof result.current.handleTrackMouseDown>[0]);
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expectJumpToCommit(commits[1].sha);
  });

  it('does not stop playback again when the track is clicked while already paused', () => {
    const setIsPlaying = vi.fn();
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[0].sha,
      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying,
      timelineCommits: commits,
    }));

    act(() => {
      result.current.setTrackElement(createTrack());
    });

    act(() => {
      result.current.handleTrackMouseDown({
        clientX: 100,
      } as Parameters<typeof result.current.handleTrackMouseDown>[0]);
    });

    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(scrubPositionModule.jumpToTrackPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        clientX: 100,
      }),
    );
  });

  it('uses the latest playback flag when track dragging starts after a rerender', () => {
    const setIsPlaying = vi.fn();
    const { result, rerender } = renderHook(
      (props: { isPlaying: boolean }) => useTimelineController({
        currentCommitSha: commits[0].sha,
        isPlaying: props.isPlaying,
        playbackSpeed: 1,
        setIsPlaying,
        timelineCommits: commits,
      }),
      {
        initialProps: { isPlaying: false },
      },
    );

    act(() => {
      result.current.setTrackElement(createTrack());
    });

    rerender({ isPlaying: true });

    act(() => {
      result.current.handleTrackMouseDown({
        clientX: 120,
      } as Parameters<typeof result.current.handleTrackMouseDown>[0]);
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
  });

  it('continues scrubbing on mousemove after the drag starts and stops after mouseup', () => {
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[0].sha,
      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying: vi.fn(),
      timelineCommits: commits,
    }));

    act(() => {
      result.current.setTrackElement(createTrack());
    });

    act(() => {
      result.current.handleTrackMouseDown({
        clientX: 75,
      } as Parameters<typeof result.current.handleTrackMouseDown>[0]);
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
      window.dispatchEvent(new MouseEvent('mouseup'));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 225 }));
    });

    expect(scrubPositionModule.jumpToTrackPosition).toHaveBeenCalledTimes(2);
    expect(vi.mocked(scrubPositionModule.jumpToTrackPosition).mock.calls[1]?.[0]).toMatchObject({
      clientX: 150,
    });
  });

  it('rebinds drag listeners when the commit list changes', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const { rerender } = renderHook(
      (props: { timelineCommits: ICommitInfo[] }) => useTimelineController({
        currentCommitSha: props.timelineCommits[0]?.sha ?? null,
        isPlaying: false,
        playbackSpeed: 1,
        setIsPlaying: vi.fn(),
        timelineCommits: props.timelineCommits,
      }),
      {
        initialProps: { timelineCommits: commits },
      },
    );

    rerender({
      timelineCommits: [
        ...commits,
        {
          author: 'Dana',
          message: 'Follow-up',
          parents: [commits[2].sha],
          sha: 'ddd444ddd444ddd444ddd444ddd444ddd444ddd4',
          timestamp: 4500,
        },
      ],
    });

    expect(addEventListener).toHaveBeenCalledTimes(4);
    expect(removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('recomputes the derived view state when the selected commit changes', () => {
    const { result, rerender } = renderHook(
      (props: { currentCommitSha: string | null }) => useTimelineController({
        currentCommitSha: props.currentCommitSha,
        isPlaying: false,
        playbackSpeed: 1,
        setIsPlaying: vi.fn(),
        timelineCommits: commits,
      }),
      {
        initialProps: { currentCommitSha: commits[0].sha },
      },
    );

    expect(result.current.indicatorPosition).toBe(0);
    expect(result.current.isAtEnd).toBe(false);

    rerender({ currentCommitSha: commits[2].sha });

    expect(result.current.indicatorPosition).toBe(100);
    expect(result.current.isAtEnd).toBe(true);
  });

  it('reduces date ticks when the timeline track is narrow', () => {
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[1].sha,
      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying: vi.fn(),
      timelineCommits: commits,
    }));

    act(() => {
      result.current.setTrackElement(createTrack(240));
    });

    expect(result.current.dateTicks.length).toBeLessThan(7);
  });

  it('uses four interior date ticks on a medium-narrow track', () => {
    const { result } = renderHook(() => useTimelineController({
      currentCommitSha: commits[1].sha,
      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying: vi.fn(),
      timelineCommits: commits,
    }));

    act(() => {
      result.current.setTrackElement(createTrack(560));
    });

    expect(result.current.dateTicks).toHaveLength(4);
  });
});
