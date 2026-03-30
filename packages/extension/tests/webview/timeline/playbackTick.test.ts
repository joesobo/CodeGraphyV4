import type { MutableRefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';
import { clearSentMessages, findMessage } from '../../helpers/sentMessages';
import { createTimelinePlaybackTick } from '../../../src/webview/components/timeline/playbackTick';

function createRef<T>(current: T): MutableRefObject<T> {
  return { current } as MutableRefObject<T>;
}

function expectJumpToCommit(sha: string): void {
  expect(findMessage('JUMP_TO_COMMIT')).toEqual({
    type: 'JUMP_TO_COMMIT',
    payload: { sha },
  });
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
    clearSentMessages();
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
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);
    expect(refs.rafRef.current).toBe(91);
  });

  it('treats the first animation frame as zero elapsed time', () => {
    let playbackTime: number | null = 1000;
    const refs = {
      lastFrameTimeRef: createRef(0),
      lastSentCommitIndexRef: createRef(0),
      playbackSpeedRef: createRef(4),
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

    tick(5000);

    expect(playbackTime).toBe(1000);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
    expect(setIsPlaying).not.toHaveBeenCalled();
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
    expectJumpToCommit(commits[1].sha);
    expect(setIsPlaying).not.toHaveBeenCalled();
  });

  it('uses playback speed as a multiplier when advancing playback time', () => {
    let playbackTime: number | null = 1000;
    const refs = {
      lastFrameTimeRef: createRef(1000),
      lastSentCommitIndexRef: createRef(0),
      playbackSpeedRef: createRef(2),
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

    tick(1500);

    expect(playbackTime).toBe(173800);
    expectJumpToCommit(commits[1].sha);
    expect(setIsPlaying).not.toHaveBeenCalled();
  });

  it('emits a jump when playback lands on the first commit', () => {
    let playbackTime: number | null = 1000;
    const edgeCommits: ICommitInfo[] = [
      {
        author: 'Alice',
        message: 'Initial commit',
        parents: [],
        sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
        timestamp: 1000,
      },
      {
        author: 'Bob',
        message: 'Later commit',
        parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
        sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
        timestamp: 5000,
      },
    ];
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
      maxTimestamp: 10000,
      refs,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: edgeCommits,
    });

    tick(1000);

    expect(playbackTime).toBe(1000);
    expect(refs.lastSentCommitIndexRef.current).toBe(0);
    expectJumpToCommit(edgeCommits[0].sha);
  });

  it('does not emit a jump when playback remains before the first commit', () => {
    let playbackTime: number | null = 100;
    const refs = {
      lastFrameTimeRef: createRef(1000),
      lastSentCommitIndexRef: createRef(-2),
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

    tick(1001);

    expect(playbackTime).toBeCloseTo(272.8, 5);
    expect(refs.lastSentCommitIndexRef.current).toBe(-2);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
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
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
  });

  it('stops playback when it lands exactly on the maximum timestamp', () => {
    let playbackTime: number | null = 1000;
    const edgeCommits: ICommitInfo[] = [
      {
        author: 'Alice',
        message: 'Initial commit',
        parents: [],
        sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
        timestamp: 1000,
      },
      {
        author: 'Bob',
        message: 'Final commit',
        parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
        sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
        timestamp: 173800,
      },
    ];
    const refs = {
      lastFrameTimeRef: createRef(1000),
      lastSentCommitIndexRef: createRef(1),
      playbackSpeedRef: createRef(1),
      rafRef: createRef<number | null>(null),
    };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn((update: number | null | ((value: number | null) => number | null)) => {
      playbackTime = typeof update === 'function' ? update(playbackTime) : update;
    });

    const tick = createTimelinePlaybackTick({
      maxTimestamp: 173800,
      refs,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: edgeCommits,
    });

    tick(2000);

    expect(playbackTime).toBe(173800);
    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
  });
});
