import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetTimelinePlaybackToStart } from '../../../../../../../src/webview/components/timeline/use/controller/resetToStart';

const { postMessage } = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../../../../src/webview/vscodeApi', () => ({
  postMessage,
}));

describe('timeline/use/controller/jumpToStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets the pending play flag, stops playback when needed, and requests a timeline reset', () => {
    const pendingPlayFromStartRef = { current: true } as { current: boolean };
    const setIsPlaying = vi.fn();

    resetTimelinePlaybackToStart({
      isPlaying: true,
      pendingPlayFromStartRef,
      setIsPlaying,
    });

    expect(pendingPlayFromStartRef.current).toBe(false);
    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(postMessage).toHaveBeenCalledWith({ type: 'RESET_TIMELINE' });
  });

  it('requests a timeline reset without stopping playback when already paused', () => {
    const pendingPlayFromStartRef = { current: true } as { current: boolean };
    const setIsPlaying = vi.fn();

    resetTimelinePlaybackToStart({
      isPlaying: false,
      pendingPlayFromStartRef,
      setIsPlaying,
    });

    expect(pendingPlayFromStartRef.current).toBe(false);
    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({ type: 'RESET_TIMELINE' });
  });
});
