import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/contracts';
import { useTimelineNavigation } from '../../../../../../src/webview/components/timeline/use/controller/navigation';

const {
  postMessage,
  runJumpToCommitAction,
  runJumpToEndAction,
  runPlayPauseAction,
} = vi.hoisted(() => ({
  postMessage: vi.fn(),
  runJumpToCommitAction: vi.fn(),
  runJumpToEndAction: vi.fn(),
  runPlayPauseAction: vi.fn(),
}));

vi.mock('../../../../../../src/webview/vscodeApi', () => ({
  postMessage,
}));

vi.mock('../../../../../../src/webview/components/timeline/playbackActions', () => ({
  runJumpToCommitAction,
  runJumpToEndAction,
  runPlayPauseAction,
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

function renderNavigationHook(
  overrides: Partial<Parameters<typeof useTimelineNavigation>[0]> = {},
) {
  const setIsPlaying = vi.fn();
  const setPlaybackTime = vi.fn();
  const lastSentCommitIndexRef = { current: -1 } as { current: number };
  const startFromTimeRef = { current: null } as { current: number | null };

  const hook = renderHook(
    (props: Partial<Parameters<typeof useTimelineNavigation>[0]>) => useTimelineNavigation({
      currentCommitSha: commits[1].sha,
      currentIndex: 1,
      isAtEnd: false,
      isPlaying: false,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef,
      timelineCommits: commits,
      ...props,
    }),
    {
      initialProps: overrides,
    },
  );

  return {
    ...hook,
    lastSentCommitIndexRef,
    setIsPlaying,
    setPlaybackTime,
    startFromTimeRef,
  };
}

describe('timeline/use/controller/navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests a reset when playback resumes at the end and then syncs the restart commit', () => {
    const { lastSentCommitIndexRef, rerender, result, setIsPlaying, setPlaybackTime } = renderNavigationHook({
      currentCommitSha: commits[2].sha,
      currentIndex: 2,
      isAtEnd: true,
    });

    result.current.handlePlayPause();

    expect(postMessage).toHaveBeenCalledWith({ type: 'RESET_TIMELINE' });
    expect(runPlayPauseAction).not.toHaveBeenCalled();

    rerender({
      currentCommitSha: commits[0].sha,
      currentIndex: 0,
      isAtEnd: false,
    });

    expect(setIsPlaying).toHaveBeenCalledWith(true);
    expect(lastSentCommitIndexRef.current).toBe(0);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[0].timestamp);
  });

  it('delegates play-pause with the latest props when playback should not reset', () => {
    const { rerender, result, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime, startFromTimeRef } =
      renderNavigationHook({
        isAtEnd: true,
        isPlaying: false,
      });

    rerender({
      isAtEnd: true,
      isPlaying: true,
    });

    result.current.handlePlayPause();

    expect(postMessage).not.toHaveBeenCalled();
    expect(runPlayPauseAction).toHaveBeenCalledWith({
      isAtEnd: true,
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef,
      timelineCommits: commits,
    });
  });

  it('delegates jump-to-end with the latest props', () => {
    const nextCommits = [...commits, {
      author: 'Dana',
      message: 'Release',
      parents: [commits[2].sha],
      sha: 'ddd444ddd444ddd444ddd444ddd444ddd444ddd4',
      timestamp: 4000,
    }];
    const { rerender, result, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime } = renderNavigationHook();

    rerender({
      isPlaying: true,
      timelineCommits: nextCommits,
    });

    result.current.handleJumpToEnd();

    expect(runJumpToEndAction).toHaveBeenCalledWith({
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: nextCommits,
    });
  });

  it('resets to the start and stops playback when jump-to-start is used while playing', () => {
    const { result, setIsPlaying } = renderNavigationHook({
      isPlaying: true,
    });

    result.current.handleJumpToStart();

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(postMessage).toHaveBeenCalledWith({ type: 'RESET_TIMELINE' });
  });

  it('resets to the start without stopping playback when already paused', () => {
    const { result, setIsPlaying } = renderNavigationHook({
      isPlaying: false,
    });

    result.current.handleJumpToStart();

    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({ type: 'RESET_TIMELINE' });
  });

  it('delegates previous and next jumps using the latest current index', () => {
    const { rerender, result, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime } = renderNavigationHook({
      currentIndex: 1,
      isPlaying: true,
    });

    rerender({
      currentIndex: 2,
      isPlaying: true,
    });

    result.current.handleJumpToPrevious();
    result.current.handleJumpToNext();

    expect(runJumpToCommitAction).toHaveBeenNthCalledWith(1, {
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: 1,
      timelineCommits: commits,
    });
    expect(runJumpToCommitAction).toHaveBeenNthCalledWith(2, {
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: 3,
      timelineCommits: commits,
    });
  });

  it('delegates jump-to-commit for known shas and ignores missing shas', () => {
    const { result, lastSentCommitIndexRef, setIsPlaying, setPlaybackTime } = renderNavigationHook({
      isPlaying: true,
    });

    result.current.handleJumpToCommit(commits[0].sha);
    result.current.handleJumpToCommit(commits[2].sha);
    result.current.handleJumpToCommit('missing');

    expect(runJumpToCommitAction).toHaveBeenCalledTimes(2);
    expect(runJumpToCommitAction).toHaveBeenNthCalledWith(1, {
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: 0,
      timelineCommits: commits,
    });
    expect(runJumpToCommitAction).toHaveBeenNthCalledWith(2, {
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: 2,
      timelineCommits: commits,
    });
  });
});
