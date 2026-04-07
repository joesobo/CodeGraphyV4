import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runJumpToCommitAction,
  runJumpToEndAction,
  runPlayPauseAction,
} from '../../../../src/webview/components/timeline/playbackActions';

const { postMessage } = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage,
}));

const commits = [
  { author: 'Alice', message: 'Initial', parents: [], sha: 'aaa', timestamp: 1000 },
  { author: 'Bob', message: 'Next', parents: ['aaa'], sha: 'bbb', timestamp: 2000 },
  { author: 'Cara', message: 'Final', parents: ['bbb'], sha: 'ccc', timestamp: 3000 },
];

describe('timeline/playbackActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts playback without rewinding when there are no commits at the end', () => {
    const lastSentCommitIndexRef = { current: 5 } as { current: number };
    const startFromTimeRef = { current: null } as { current: number | null };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runPlayPauseAction({
      isAtEnd: true,
      isPlaying: false,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      startFromTimeRef,
      timelineCommits: [],
    });

    expect(lastSentCommitIndexRef.current).toBe(5);
    expect(startFromTimeRef.current).toBeNull();
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(setIsPlaying).toHaveBeenCalledWith(true);
  });

  it('jumps to the first commit when the requested target is before the start', () => {
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runJumpToCommitAction({
      isPlaying: false,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: -5,
      timelineCommits: commits,
    });

    expect(lastSentCommitIndexRef.current).toBe(0);
    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[0].timestamp);
    expect(postMessage).toHaveBeenCalledWith({ type: 'JUMP_TO_COMMIT', payload: { sha: commits[0].sha } });
  });

  it('jumps to the last commit when the requested target is after the end', () => {
    const lastSentCommitIndexRef = { current: 0 } as { current: number };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runJumpToCommitAction({
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      targetIndex: 99,
      timelineCommits: commits,
    });

    expect(lastSentCommitIndexRef.current).toBe(2);
    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[2].timestamp);
    expect(postMessage).toHaveBeenCalledWith({ type: 'JUMP_TO_COMMIT', payload: { sha: commits[2].sha } });
  });

  it('jumps to the last commit and stops playback when jumping to the end', () => {
    const lastSentCommitIndexRef = { current: -1 } as { current: number };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runJumpToEndAction({
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: commits,
    });

    expect(lastSentCommitIndexRef.current).toBe(2);
    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(setPlaybackTime).toHaveBeenCalledWith(commits[2].timestamp);
    expect(postMessage).toHaveBeenCalledWith({ type: 'JUMP_TO_COMMIT', payload: { sha: commits[2].sha } });
  });

  it('does nothing when asked to jump to the end without commits', () => {
    const lastSentCommitIndexRef = { current: 4 } as { current: number };
    const setIsPlaying = vi.fn();
    const setPlaybackTime = vi.fn();

    runJumpToEndAction({
      isPlaying: true,
      lastSentCommitIndexRef,
      setIsPlaying,
      setPlaybackTime,
      timelineCommits: [],
    });

    expect(lastSentCommitIndexRef.current).toBe(4);
    expect(setIsPlaying).not.toHaveBeenCalled();
    expect(setPlaybackTime).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});
