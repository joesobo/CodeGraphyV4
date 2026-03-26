import type { MutableRefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '../../../src/shared/contracts';
import { syncTimelinePlaybackFromCommit } from '../../../src/webview/components/timeline/syncPlayback';

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
    timestamp: 2000,
  },
];

describe('timeline/syncPlayback', () => {
  it('syncs playback time from the current commit when playback is idle', () => {
    const lastSentCommitIndexRef = createRef(-1);
    const setPlaybackTime = vi.fn();

    syncTimelinePlaybackFromCommit({
      currentCommitSha: commits[1].sha,
      isPlaying: false,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits: commits,
      userScrubActiveRef: createRef(false),
    });

    expect(setPlaybackTime).toHaveBeenCalledWith(commits[1].timestamp);
    expect(lastSentCommitIndexRef.current).toBe(1);
  });

  it('does not sync playback while playback is actively running', () => {
    const lastSentCommitIndexRef = createRef(-1);
    const setPlaybackTime = vi.fn();

    syncTimelinePlaybackFromCommit({
      currentCommitSha: commits[1].sha,
      isPlaying: true,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits: commits,
      userScrubActiveRef: createRef(false),
    });

    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(lastSentCommitIndexRef.current).toBe(-1);
  });

  it('does not sync playback while the user is actively scrubbing', () => {
    const lastSentCommitIndexRef = createRef(-1);
    const setPlaybackTime = vi.fn();

    syncTimelinePlaybackFromCommit({
      currentCommitSha: commits[1].sha,
      isPlaying: false,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits: commits,
      userScrubActiveRef: createRef(true),
    });

    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(lastSentCommitIndexRef.current).toBe(-1);
  });

  it('does not sync playback when the requested commit is missing', () => {
    const lastSentCommitIndexRef = createRef(-1);
    const setPlaybackTime = vi.fn();

    syncTimelinePlaybackFromCommit({
      currentCommitSha: 'missing-sha',
      isPlaying: false,
      lastSentCommitIndexRef,
      setPlaybackTime,
      timelineCommits: commits,
      userScrubActiveRef: createRef(false),
    });

    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(lastSentCommitIndexRef.current).toBe(-1);
  });
});
