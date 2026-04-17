import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/contracts';
import { clearSentMessages, findMessage } from '../../../../../helpers/sentMessages';
import * as dragListenersModule from '../../../../../../src/webview/components/timeline/dragListeners';
import * as scrubPositionModule from '../../../../../../src/webview/components/timeline/scrubPosition';
import { useTimelineScrub } from '../../../../../../src/webview/components/timeline/use/controller/scrub';

vi.mock('../../../../../../src/webview/components/timeline/dragListeners', async () => {
  const actual = await vi.importActual<typeof import('../../../../../../src/webview/components/timeline/dragListeners')>(
    '../../../../../../src/webview/components/timeline/dragListeners',
  );

  return {
    ...actual,
    bindTimelineDragListeners: vi.fn(actual.bindTimelineDragListeners),
  };
});

vi.mock('../../../../../../src/webview/components/timeline/scrubPosition', async () => {
  const actual = await vi.importActual<typeof import('../../../../../../src/webview/components/timeline/scrubPosition')>(
    '../../../../../../src/webview/components/timeline/scrubPosition',
  );

  return {
    ...actual,
    jumpToTrackPosition: vi.fn(actual.jumpToTrackPosition),
  };
});

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

describe('timeline/use/controller/scrub', () => {
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

  it('pauses playback and debounces track scrubbing before posting a jump', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const trackElementRef = { current: createTrack() } as { current: HTMLDivElement | null };
    const { result } = renderHook(() => useTimelineScrub({
      debounceTimerRef: { current: null },
      isPlaying: true,
      lastSentCommitIndexRef: { current: -1 },
      scrubResetTimerRef: { current: null },
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
      trackElementRef,
      userScrubActiveRef: { current: false },
    }));

    act(() => {
      result.current.handleTrackMouseDown({
        clientX: 150,
      } as Parameters<typeof result.current.handleTrackMouseDown>[0]);
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(setPlaybackTime).toHaveBeenCalledWith(2000);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(findMessage('JUMP_TO_COMMIT')).toEqual({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[1].sha },
    });
  });

  it('binds drag listeners with an initially idle dragging ref and activates it on mouse down', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const trackElementRef = { current: createTrack() } as { current: HTMLDivElement | null };
    const { result } = renderHook(() => useTimelineScrub({
      debounceTimerRef: { current: null },
      isPlaying: false,
      lastSentCommitIndexRef: { current: -1 },
      scrubResetTimerRef: { current: null },
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
      trackElementRef,
      userScrubActiveRef: { current: false },
    }));

    const listenerBinding = vi.mocked(dragListenersModule.bindTimelineDragListeners).mock.calls[0]?.[0];
    expect(listenerBinding?.isDraggingRef.current).toBe(false);

    act(() => {
      result.current.handleTrackMouseDown({
        clientX: 120,
      } as Parameters<typeof result.current.handleTrackMouseDown>[0]);
    });

    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(listenerBinding?.isDraggingRef.current).toBe(true);
    expect(scrubPositionModule.jumpToTrackPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        clientX: 120,
        timelineCommits: commits,
        trackElement: trackElementRef.current,
      }),
    );
  });

  it('rebinds drag listeners and uses the latest commits after rerender', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const initialTrack = createTrack(300);
    const nextTrack = createTrack(600);
    const trackElementRef = { current: initialTrack } as { current: HTMLDivElement | null };
    const initialCommits = commits.slice(0, 2);
    const nextCommits = commits;
    const { rerender } = renderHook(
      ({ isPlaying, timelineCommits }: { isPlaying: boolean; timelineCommits: ICommitInfo[] }) =>
        useTimelineScrub({
          debounceTimerRef: { current: null },
          isPlaying,
          lastSentCommitIndexRef: { current: -1 },
          scrubResetTimerRef: { current: null },
          setIsPlaying,
          setPlaybackTime,
          timelineCommits,
          trackElementRef,
          userScrubActiveRef: { current: false },
        }),
      {
        initialProps: {
          isPlaying: false,
          timelineCommits: initialCommits,
        },
      },
    );

    const firstBinding = vi.mocked(dragListenersModule.bindTimelineDragListeners).mock.calls[0]?.[0];

    trackElementRef.current = nextTrack;
    rerender({
      isPlaying: true,
      timelineCommits: nextCommits,
    });

    expect(vi.mocked(dragListenersModule.bindTimelineDragListeners)).toHaveBeenCalledTimes(2);

    const latestBinding = vi.mocked(dragListenersModule.bindTimelineDragListeners).mock.calls.at(-1)?.[0];
    expect(latestBinding).not.toBe(firstBinding);

    act(() => {
      if (latestBinding) {
        latestBinding.isDraggingRef.current = true;
        latestBinding.onDrag(450);
      }
    });

    expect(scrubPositionModule.jumpToTrackPosition).toHaveBeenLastCalledWith(
      expect.objectContaining({
        clientX: 450,
        timelineCommits: nextCommits,
        trackElement: nextTrack,
      }),
    );
  });
});
