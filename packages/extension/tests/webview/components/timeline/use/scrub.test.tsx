import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';
import { clearSentMessages, findMessage } from '../../../../helpers/sentMessages';
import { useTimelineScrub } from '../../../../../src/webview/components/timeline/use/scrub';

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

describe('timeline/use/scrub', () => {
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
});
