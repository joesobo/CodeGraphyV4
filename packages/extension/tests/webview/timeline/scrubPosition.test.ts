import type { MutableRefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '../../../src/shared/contracts';
import { jumpToTrackPosition } from '../../../src/webview/components/timeline/scrubPosition';

const postMessage = vi.fn();

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => postMessage(message),
}));

function createRef<T>(current: T): MutableRefObject<T> {
  return { current } as MutableRefObject<T>;
}

const commits: ICommitInfo[] = [
  {
    author: 'Alice',
    message: 'Initial commit',
    parents: [],
    sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    timestamp: 10,
  },
  {
    author: 'Bob',
    message: 'Feature branch',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 20,
  },
  {
    author: 'Cara',
    message: 'Release',
    parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: 30,
  },
];

function createTrack(): HTMLDivElement {
  const track = document.createElement('div');
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    bottom: 24,
    height: 24,
    left: 100,
    right: 300,
    top: 0,
    width: 200,
    x: 100,
    y: 0,
    toJSON: () => ({}),
  });
  return track;
}

describe('timeline/scrubPosition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    postMessage.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when there is no track element to scrub', () => {
    const setPlaybackTime = vi.fn();

    jumpToTrackPosition({
      clientX: 150,
      debounceTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
      lastSentCommitIndexRef: createRef(-1),
      scrubResetTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
      setPlaybackTime,
      timelineCommits: commits,
      trackElement: null,
      userScrubActiveRef: createRef(false),
    });

    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('does nothing when the track exists but there are no commits to scrub', () => {
    const setPlaybackTime = vi.fn();

    jumpToTrackPosition({
      clientX: 150,
      debounceTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
      lastSentCommitIndexRef: createRef(-1),
      scrubResetTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
      setPlaybackTime,
      timelineCommits: [],
      trackElement: createTrack(),
      userScrubActiveRef: createRef(false),
    });

    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('updates playback time immediately and sends the matched commit after the debounce', () => {
    let playbackTime: number | null = null;
    const debounceTimerRef = createRef<ReturnType<typeof setTimeout> | null>(null);
    const scrubResetTimerRef = createRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSentCommitIndexRef = createRef(-1);
    const userScrubActiveRef = createRef(false);
    const setPlaybackTime = vi.fn((update: number | null | ((value: number | null) => number | null)) => {
      playbackTime = typeof update === 'function' ? update(playbackTime) : update;
    });

    jumpToTrackPosition({
      clientX: 200,
      debounceTimerRef,
      lastSentCommitIndexRef,
      scrubResetTimerRef,
      setPlaybackTime,
      timelineCommits: commits,
      trackElement: createTrack(),
      userScrubActiveRef,
    });

    expect(playbackTime).toBe(20);
    expect(userScrubActiveRef.current).toBe(true);
    expect(lastSentCommitIndexRef.current).toBe(1);
    expect(postMessage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(49);
    expect(postMessage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[1].sha },
    });

    vi.advanceTimersByTime(199);
    expect(userScrubActiveRef.current).toBe(true);

    vi.advanceTimersByTime(1);
    expect(userScrubActiveRef.current).toBe(false);
  });

  it('does not clear timers when there are no pending scrub timers', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    jumpToTrackPosition({
      clientX: 200,
      debounceTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
      lastSentCommitIndexRef: createRef(-1),
      scrubResetTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
      setPlaybackTime: vi.fn(),
      timelineCommits: commits,
      trackElement: createTrack(),
      userScrubActiveRef: createRef(false),
    });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('clears pending scrub timers and clamps positions before the track start', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const pendingDebounceCallback = vi.fn();
    const pendingResetCallback = vi.fn();
    let playbackTime: number | null = null;
    const debounceTimerRef = createRef<ReturnType<typeof setTimeout> | null>(
      setTimeout(pendingDebounceCallback, 500),
    );
    const scrubResetTimerRef = createRef<ReturnType<typeof setTimeout> | null>(
      setTimeout(pendingResetCallback, 500),
    );
    const lastSentCommitIndexRef = createRef(-1);
    const setPlaybackTime = vi.fn((update: number | null | ((value: number | null) => number | null)) => {
      playbackTime = typeof update === 'function' ? update(playbackTime) : update;
    });

    jumpToTrackPosition({
      clientX: 20,
      debounceTimerRef,
      lastSentCommitIndexRef,
      scrubResetTimerRef,
      setPlaybackTime,
      timelineCommits: commits,
      trackElement: createTrack(),
      userScrubActiveRef: createRef(false),
    });

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(playbackTime).toBe(10);
    expect(lastSentCommitIndexRef.current).toBe(0);

    vi.advanceTimersByTime(600);

    expect(pendingDebounceCallback).not.toHaveBeenCalled();
    expect(pendingResetCallback).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[0].sha },
    });
  });
});
