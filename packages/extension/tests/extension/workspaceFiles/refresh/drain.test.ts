import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  scheduleWorkspaceRefresh,
  waitForWorkspaceRefreshIdle,
} from '../../../../src/extension/workspaceFiles/refresh/scheduler';

function makeProvider() {
  return {
    refreshChangedFiles: vi.fn().mockResolvedValue(undefined),
    refreshGitignoreMetadata: vi.fn().mockResolvedValue(undefined),
    refreshIndex: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    invalidateWorkspaceFiles: vi.fn(() => []),
    isGraphOpen: vi.fn(() => true),
    markWorkspaceRefreshPending: vi.fn(),
  };
}

describe('workspaceFiles/refresh/drain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the pending debounce and in-flight graph refresh to finish', async () => {
    vi.useFakeTimers();
    let resolveRefresh!: () => void;
    const refreshDone = new Promise<void>(resolve => {
      resolveRefresh = resolve;
    });
    const provider = makeProvider();
    provider.refreshChangedFiles.mockReturnValue(refreshDone);
    let idleSettled = false;

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    const idle = waitForWorkspaceRefreshIdle(provider as never).then(() => {
      idleSettled = true;
    });

    await Promise.resolve();
    expect(idleSettled).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(idleSettled).toBe(false);

    resolveRefresh();
    await idle;
    expect(idleSettled).toBe(true);
  });

  it('waits for the delayed create follow-up graph refresh to finish', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    let idleSettled = false;

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      ['/workspace/src/new.ts'],
      500,
      { followUpDelayMs: 1_500 },
    );
    const idle = waitForWorkspaceRefreshIdle(provider as never).then(() => {
      idleSettled = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(idleSettled).toBe(false);
    expect(provider.refreshChangedFiles).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1_501);
    await idle;
    expect(provider.refreshChangedFiles).toHaveBeenCalledTimes(2);
    expect(idleSettled).toBe(true);
  });

  it('rejects an idle wait when the graph refresh fails', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    const error = new Error('refresh failed');
    provider.refreshChangedFiles.mockRejectedValue(error);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    const idle = waitForWorkspaceRefreshIdle(provider as never);
    const rejection = expect(idle).rejects.toBe(error);

    await vi.advanceTimersByTimeAsync(500);
    await rejection;
  });

  it('keeps waiting when scheduler work arrives during the quiet window', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    let idleSettled = false;

    const idle = waitForWorkspaceRefreshIdle(
      provider as never,
      { quietMs: 32 },
    ).then(() => {
      idleSettled = true;
    });
    setTimeout(() => {
      scheduleWorkspaceRefresh(
        provider as never,
        '[CodeGraphy] File changed, refreshing graph',
        ['/workspace/src/a.ts'],
        0,
      );
    }, 9);

    await vi.advanceTimersByTimeAsync(10);
    expect(provider.refreshChangedFiles).toHaveBeenCalledOnce();
    expect(idleSettled).toBe(false);

    await vi.advanceTimersByTimeAsync(31);
    expect(idleSettled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await idle;
    expect(idleSettled).toBe(true);
  });
});
