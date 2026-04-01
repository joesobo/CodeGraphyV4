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

interface PlaybackScenarioOptions {
  lastFrameTime?: number;
  lastSentCommitIndex?: number;
  maxTimestamp?: number;
  playbackSpeed?: number;
  playbackTime?: number | null;
  rafId?: number | null;
  timelineCommits?: ICommitInfo[];
}

function createPlaybackScenario({
  lastFrameTime = 1000,
  lastSentCommitIndex = -1,
  maxTimestamp = 300000,
  playbackSpeed = 1,
  playbackTime: initialPlaybackTime = 1000,
  rafId = null,
  timelineCommits = commits,
}: PlaybackScenarioOptions = {}) {
  let playbackTime = initialPlaybackTime;
  const refs = {
    lastFrameTimeRef: createRef(lastFrameTime),
    lastSentCommitIndexRef: createRef(lastSentCommitIndex),
    playbackSpeedRef: createRef(playbackSpeed),
    rafRef: createRef<number | null>(rafId),
  };
  const setIsPlaying = vi.fn();
  const setPlaybackTime = vi.fn((update: number | null | ((value: number | null) => number | null)) => {
    playbackTime = typeof update === 'function' ? update(playbackTime) : update;
  });
  const tick = createTimelinePlaybackTick({
    maxTimestamp,
    refs,
    setIsPlaying,
    setPlaybackTime,
    timelineCommits,
  });

  return {
    getPlaybackTime: () => playbackTime,
    refs,
    setIsPlaying,
    setPlaybackTime,
    tick,
  };
}

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
    const scenario = createPlaybackScenario({
      lastFrameTime: 100,
      playbackTime: null,
    });

    scenario.tick(200);

    expect(scenario.getPlaybackTime()).toBeNull();
    expect(scenario.refs.lastFrameTimeRef.current).toBe(200);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
    expect(scenario.setIsPlaying).not.toHaveBeenCalled();
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);
    expect(scenario.refs.rafRef.current).toBe(91);
  });

  it('treats the first animation frame as zero elapsed time', () => {
    const scenario = createPlaybackScenario({
      lastFrameTime: 0,
      lastSentCommitIndex: 0,
      playbackSpeed: 4,
    });

    scenario.tick(5000);

    expect(scenario.getPlaybackTime()).toBe(1000);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
    expect(scenario.setIsPlaying).not.toHaveBeenCalled();
  });

  it('advances playback time and jumps to newly crossed commits', () => {
    const scenario = createPlaybackScenario();

    scenario.tick(2000);

    expect(scenario.getPlaybackTime()).toBe(173800);
    expect(scenario.refs.lastSentCommitIndexRef.current).toBe(1);
    expectJumpToCommit(commits[1].sha);
    expect(scenario.setIsPlaying).not.toHaveBeenCalled();
  });

  it('uses playback speed as a multiplier when advancing playback time', () => {
    const scenario = createPlaybackScenario({
      lastSentCommitIndex: 0,
      playbackSpeed: 2,
    });

    scenario.tick(1500);

    expect(scenario.getPlaybackTime()).toBe(173800);
    expectJumpToCommit(commits[1].sha);
    expect(scenario.setIsPlaying).not.toHaveBeenCalled();
  });

  it('emits a jump when playback lands on the first commit', () => {
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
    const scenario = createPlaybackScenario({
      maxTimestamp: 10000,
      timelineCommits: edgeCommits,
    });

    scenario.tick(1000);

    expect(scenario.getPlaybackTime()).toBe(1000);
    expect(scenario.refs.lastSentCommitIndexRef.current).toBe(0);
    expectJumpToCommit(edgeCommits[0].sha);
  });

  it('does not emit a jump when playback remains before the first commit', () => {
    const scenario = createPlaybackScenario({
      lastSentCommitIndex: -2,
      playbackTime: 100,
    });

    scenario.tick(1001);

    expect(scenario.getPlaybackTime()).toBeCloseTo(272.8, 5);
    expect(scenario.refs.lastSentCommitIndexRef.current).toBe(-2);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
    expect(scenario.setIsPlaying).not.toHaveBeenCalled();
  });

  it('clamps playback to the maximum timestamp and stops playback at the end', () => {
    const scenario = createPlaybackScenario({
      lastSentCommitIndex: 2,
      playbackTime: 250000,
    });

    scenario.tick(2000);

    expect(scenario.getPlaybackTime()).toBe(300000);
    expect(scenario.setIsPlaying).toHaveBeenCalledWith(false);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
  });

  it('stops playback when it lands exactly on the maximum timestamp', () => {
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
    const scenario = createPlaybackScenario({
      lastSentCommitIndex: 1,
      maxTimestamp: 173800,
      timelineCommits: edgeCommits,
    });

    scenario.tick(2000);

    expect(scenario.getPlaybackTime()).toBe(173800);
    expect(scenario.setIsPlaying).toHaveBeenCalledWith(false);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
  });
});
