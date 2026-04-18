import { describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '../../../../src/shared/timeline/contracts';
import {
  invalidateGraphViewTimelineCache,
  sendCachedGraphViewTimeline,
  sendGraphViewPlaybackSpeed,
  type GraphViewTimelinePlaybackState,
} from '../../../../src/extension/graphView/timeline/playback';

function createState(
  overrides: Partial<GraphViewTimelinePlaybackState> = {},
): GraphViewTimelinePlaybackState {
  return {
    timelineActive: false,
    currentCommitSha: undefined,
    ...overrides,
  };
}

const cachedCommits: ICommitInfo[] = [
  { sha: 'a1', author: 'A', message: 'one', timestamp: 1, parents: [] },
  { sha: 'b2', author: 'B', message: 'two', timestamp: 2, parents: ['a1'] },
];

describe('graphView/timeline/playback', () => {
  it('does not send cached timeline data when no analyzer is available', () => {
    const sendMessage = vi.fn();
    const state = createState({
      timelineActive: true,
      currentCommitSha: 'existing',
    });

    sendCachedGraphViewTimeline(undefined, state, sendMessage);

    expect(state.timelineActive).toBe(true);
    expect(state.currentCommitSha).toBe('existing');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does not send cached timeline data when the cache is empty', () => {
    const sendMessage = vi.fn();
    const state = createState({
      timelineActive: true,
      currentCommitSha: 'existing',
    });

    sendCachedGraphViewTimeline(
      {
        getCachedCommitList() {
          return [];
        },
      },
      state,
      sendMessage,
    );

    expect(state.timelineActive).toBe(true);
    expect(state.currentCommitSha).toBe('existing');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends cached timeline data and updates the active commit state', () => {
    const sendMessage = vi.fn();
    const state = createState();

    sendCachedGraphViewTimeline(
      {
        getCachedCommitList() {
          return cachedCommits;
        },
      },
      state,
      sendMessage,
    );

    expect(state.timelineActive).toBe(true);
    expect(state.currentCommitSha).toBe('b2');
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'TIMELINE_DATA',
      payload: { commits: cachedCommits, currentSha: 'b2' },
    });
  });

  it('sends the current playback speed', () => {
    const sendMessage = vi.fn();

    sendGraphViewPlaybackSpeed(1.5, sendMessage);

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLAYBACK_SPEED_UPDATED',
      payload: { speed: 1.5 },
    });
  });

  it('invalidates the timeline cache and clears the active commit', async () => {
    const invalidateCache = vi.fn(async () => undefined);
    const sendMessage = vi.fn();
    const state = createState({
      timelineActive: true,
      currentCommitSha: 'b2',
    });

    const nextAnalyzer = await invalidateGraphViewTimelineCache(
      {
        invalidateCache,
      },
      state,
      sendMessage,
    );

    expect(state.timelineActive).toBe(false);
    expect(state.currentCommitSha).toBeUndefined();
    expect(nextAnalyzer).toBeUndefined();
    expect(invalidateCache).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({ type: 'CACHE_INVALIDATED' });
  });

  it('clears timeline state and notifies the webview even without an analyzer', async () => {
    const sendMessage = vi.fn();
    const state = createState({
      timelineActive: true,
      currentCommitSha: 'b2',
    });

    await expect(
      invalidateGraphViewTimelineCache(undefined, state, sendMessage),
    ).resolves.toBeUndefined();

    expect(state.timelineActive).toBe(false);
    expect(state.currentCommitSha).toBeUndefined();
    expect(sendMessage).toHaveBeenCalledWith({ type: 'CACHE_INVALIDATED' });
  });
});
