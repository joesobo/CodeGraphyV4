import type { MutableRefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';
import { clearSentMessages, findMessage } from '../../helpers/sentMessages';
import {
  runJumpToEndAction,
  runPlayPauseAction,
} from '../../../src/webview/components/timeline/playbackActions';

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
    message: 'Add feature X',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 2000,
  },
  {
    author: 'Cara',
    message: 'Ship release',
    parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: 3000,
  },
];

describe('timeline/playbackActions', () => {
  beforeEach(() => {
    clearSentMessages();
  });

  it('pauses playback immediately when playback is already active', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runPlayPauseAction({
      isAtEnd: false,
      isPlaying: true,
      lastSentCommitIndexRef: createRef(1),
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef: createRef<number | null>(null),
      timelineCommits: commits,
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
  });

  it('rewinds to the first commit before restarting playback from the end', () => {
    const lastSentCommitIndexRef = createRef(2);
    const startFromTimeRef = createRef<number | null>(null);
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runPlayPauseAction({
      isAtEnd: true,
      isPlaying: false,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef,
      timelineCommits: commits,
    });

    expect(lastSentCommitIndexRef.current).toBe(-1);
    expect(startFromTimeRef.current).toBe(commits[0].timestamp);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[0].timestamp);
    expect(setIsPlaying).toHaveBeenCalledWith(true);
    expectJumpToCommit(commits[0].sha);
  });

  it('starts playback without rewinding when not already at the end', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runPlayPauseAction({
      isAtEnd: false,
      isPlaying: false,
      lastSentCommitIndexRef: createRef(0),
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef: createRef<number | null>(null),
      timelineCommits: commits,
    });

    expect(setIsPlaying).toHaveBeenCalledWith(true);
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
  });

  it('does nothing when asked to jump to the end without commits', () => {
    const lastSentCommitIndexRef = createRef(-1);
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runJumpToEndAction({
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: [],
    });

    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(lastSentCommitIndexRef.current).toBe(-1);
    expect(findMessage('JUMP_TO_COMMIT')).toBeUndefined();
  });

  it('jumps to the last commit and stops active playback', () => {
    const lastSentCommitIndexRef = createRef(-1);
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runJumpToEndAction({
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    });

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[2].timestamp);
    expect(lastSentCommitIndexRef.current).toBe(2);
    expectJumpToCommit(commits[2].sha);
  });
});
