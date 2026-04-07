import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';
import { clearSentMessages, findMessage } from '../../../../helpers/sentMessages';
import { useTimelineNavigation } from '../../../../../src/webview/components/timeline/use/navigation';

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

describe('timeline/use/navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSentMessages();
  });

  it('requests a reset when playback resumes at the end', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const startFromTimeRef = { current: null } as { current: number | null };
    const { result, rerender } = renderHook(
      (props: { currentCommitSha: string | null; isAtEnd: boolean }) => useTimelineNavigation({
        currentCommitSha: props.currentCommitSha,
        currentIndex: 2,
        isAtEnd: props.isAtEnd,
        isPlaying: false,
        lastSentCommitIndexRef,
        setIsPlaying,
        setPlaybackTime,
        startFromTimeRef,
        timelineCommits: commits,
      }),
      {
        initialProps: { currentCommitSha: commits[2].sha, isAtEnd: true },
      },
    );

    result.current.handlePlayPause();
    expect(findMessage('RESET_TIMELINE')).toEqual({ type: 'RESET_TIMELINE' });

    rerender({ currentCommitSha: commits[0].sha, isAtEnd: false });

    expect(setIsPlaying).toHaveBeenCalledWith(true);
    expect(lastSentCommitIndexRef.current).toBe(0);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[0].timestamp);
  });

  it('jumps between commits using the current index and selected sha', () => {
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();
    const lastSentCommitIndexRef = { current: 1 } as { current: number };
    const startFromTimeRef = { current: null } as { current: number | null };
    const { result } = renderHook(() => useTimelineNavigation({
      currentCommitSha: commits[1].sha,
      currentIndex: 1,
      isAtEnd: false,
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef,
      timelineCommits: commits,
    }));

    result.current.handleJumpToNext();
    result.current.handleJumpToPrevious();
    result.current.handleJumpToCommit(commits[2].sha);

    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(findMessage('JUMP_TO_COMMIT')).toEqual({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: commits[2].sha },
    });
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[2].timestamp);
  });
});
