import type { MutableRefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '../../../src/shared/types';
import { createTimelinePlaybackTick } from '../../../src/webview/components/timeline/playbackTick';

const postMessage = vi.fn();

vi.mock('../../../src/webview/lib/vscodeApi', () => ({
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
    timestamp: 1000,
  },
  {
    author: 'Bob',
    message: 'Feature branch',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 100000,
  },
  {
    author: 'Cara',
    message: 'Release',
    parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: 200000,
  },
];

describe('timeline/playbackTick', () => {
  let requestAnimationFrameMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessage.mockReset();
    requestAnimationFrameMock = vi.fn(() => 91);
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps playback time unchanged when no current playback position exists', () => {
    let playbackTime: number | null = null;
    const refs = {
      lastFrameTimeRef: createRef(100),
      lastSentCommitIndexRef: createRef(-1),
      playbackSpeedRef: createRef(1),
      rafRef: createRef<number | null>(null),
    };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn((update: number | null | ((value: number | null) => number | null)) => {
      playbackTime = typeof update === 'function' ? update(playbackTime) : update;
    });

    const tick = createTimelinePlaybackTick({
      maxTimestamp: 300000,
      refs,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    });

    tick(200);

    expect(playbackTime).toBeNull();
    expect(refs.lastFrameTimeRef.current).toBe(200);
    expect(postMessage).not.toHaveBeenCalled();
    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);
    expect(refs.rafRef.current).toBe(91);
  });

  it('advances playback time and jumps to newly crossed commits', () => {
    let playbackTime: number | null = 1000;
    const refs = {
      lastFrameTimeRef: createRef(1000),
      lastSentCommitIndexRef: createRef(-1),
      playbackSpeedRef: createRef(1),
      rafRef: createRef<number | null>(null),
    };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn((update: number | null | ((value: number | null) => number | null)) => {
      playbackTime = typeof update === 'function' ? update(playbackTime) : update;
    });

    const tick = createTimelinePlaybackTick({
      maxTimestamp: 300000,
      refs,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    });

    tick(2000);

    expect(playbackTime).toBe(173800);
    expect(refs.lastSentCommitIndexRef.current).toBe(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[1].sha },
    });
    expect(setIsPlaying).not.toHaveBeenCalled();
  });

  it('clamps playback to the maximum timestamp and stops playback at the end', () => {
    let playbackTime: number | null = 250000;
    const refs = {
      lastFrameTimeRef: createRef(1000),
      lastSentCommitIndexRef: createRef(2),
      playbackSpeedRef: createRef(1),
      rafRef: createRef<number | null>(null),
    };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn((update: number | null | ((value: number | null) => number | null)) => {
      playbackTime = typeof update === 'function' ? update(playbackTime) : update;
    });

    const tick = createTimelinePlaybackTick({
      maxTimestamp: 300000,
      refs,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    });

    tick(2000);

    expect(playbackTime).toBe(300000);
    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(postMessage).not.toHaveBeenCalled();
  });
});
