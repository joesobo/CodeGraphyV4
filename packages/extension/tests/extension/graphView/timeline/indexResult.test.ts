import { describe, expect, it, vi } from 'vitest';
import { applyGraphViewTimelineIndexResult } from '../../../../src/extension/graphView/timeline/indexResult';

describe('graph view timeline index result', () => {
  it('reports when indexing returns no commits', async () => {
    const sendMessage = vi.fn();
    const showInformationMessage = vi.fn();
    const jumpToCommit = vi.fn(() => Promise.resolve());
    const state = {
      timelineActive: false,
      currentCommitSha: undefined,
    };

    await applyGraphViewTimelineIndexResult([], state, {
      sendMessage,
      showInformationMessage,
      jumpToCommit,
    });

    expect(showInformationMessage).toHaveBeenCalledWith('No commits found to index');
    expect(sendMessage).not.toHaveBeenCalled();
    expect(jumpToCommit).not.toHaveBeenCalled();
  });

  it('publishes timeline data for the latest commit and activates timeline state', async () => {
    const commits = [{ sha: '111' }, { sha: '222' }];
    const sendMessage = vi.fn();
    const jumpToCommit = vi.fn(() => Promise.resolve());
    const state = {
      timelineActive: false,
      currentCommitSha: undefined as string | undefined,
    };

    await applyGraphViewTimelineIndexResult(commits, state, {
      sendMessage,
      showInformationMessage: vi.fn(),
      jumpToCommit,
    });

    expect(state.timelineActive).toBe(true);
    expect(state.currentCommitSha).toBe('222');
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'TIMELINE_DATA',
      payload: { commits, currentSha: '222' },
    });
    expect(jumpToCommit).toHaveBeenCalledWith('222');
  });

  it('returns without activating timeline state when the latest commit entry is missing', async () => {
    const sendMessage = vi.fn();
    const showInformationMessage = vi.fn();
    const jumpToCommit = vi.fn(() => Promise.resolve());
    const state = {
      timelineActive: false,
      currentCommitSha: undefined as string | undefined,
    };

    await applyGraphViewTimelineIndexResult([{ sha: '111' }, undefined as never], state, {
      sendMessage,
      showInformationMessage,
      jumpToCommit,
    });

    expect(state.timelineActive).toBe(false);
    expect(state.currentCommitSha).toBeUndefined();
    expect(showInformationMessage).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(jumpToCommit).not.toHaveBeenCalled();
  });
});
