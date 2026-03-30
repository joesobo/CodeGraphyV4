import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';

const { syncTimelinePlaybackFromCommit } = vi.hoisted(() => ({
  syncTimelinePlaybackFromCommit: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/timeline/syncPlayback', () => ({
  syncTimelinePlaybackFromCommit,
}));

import { useTimelineCommitSync } from '../../../../../src/webview/components/timeline/use/commitSync';

describe('timeline/useCommitSync', () => {
  beforeEach(() => {
    syncTimelinePlaybackFromCommit.mockReset();
  });

  it('syncs playback using the current hook inputs', () => {
    const lastSentCommitIndexRef = { current: -1 };
    const setPlaybackTime = vi.fn();
    const timelineCommits: ICommitInfo[] = [{
      sha: 'aaa',
      timestamp: 1000,
      message: 'initial',
      author: 'tester',
      parents: [],
    }];
    const userScrubActiveRef = { current: false };

    renderHook(() => useTimelineCommitSync({
      currentCommitSha: 'aaa',
      isPlaying: false,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits,
      userScrubActiveRef,
    }));

    expect(syncTimelinePlaybackFromCommit).toHaveBeenCalledWith({
      currentCommitSha: 'aaa',
      isPlaying: false,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits,
      userScrubActiveRef,
    });
  });

  it('re-runs sync when the selected commit changes', () => {
    const lastSentCommitIndexRef = { current: -1 };
    const setPlaybackTime = vi.fn();
    const timelineCommits: ICommitInfo[] = [{
      sha: 'aaa',
      timestamp: 1000,
      message: 'initial',
      author: 'tester',
      parents: [],
    }];
    const userScrubActiveRef = { current: false };
    const { rerender } = renderHook(({ currentCommitSha }) => useTimelineCommitSync({
      currentCommitSha,
      isPlaying: false,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits,
      userScrubActiveRef,
    }), {
      initialProps: { currentCommitSha: 'aaa' },
    });

    rerender({ currentCommitSha: 'bbb' });

    expect(syncTimelinePlaybackFromCommit).toHaveBeenNthCalledWith(2, {
      currentCommitSha: 'bbb',
      isPlaying: false,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits,
      userScrubActiveRef,
    });
  });
});
