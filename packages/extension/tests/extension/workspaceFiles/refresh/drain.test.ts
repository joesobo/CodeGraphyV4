import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  armWorkspaceRefreshIdleWait,
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

  it('waits for refresh activity scheduled after the waiter is armed', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    const armed = armWorkspaceRefreshIdleWait(
      provider as never,
      { quietMs: 32, timeoutMs: 1_000 },
    );
    let idleSettled = false;
    void armed.promise.then(() => {
      idleSettled = true;
    });

    await vi.advanceTimersByTimeAsync(32);
    expect(idleSettled).toBe(false);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
      0,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(provider.refreshChangedFiles).toHaveBeenCalledOnce();
    expect(idleSettled).toBe(false);

    await vi.advanceTimersByTimeAsync(31);
    expect(idleSettled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await armed.promise;
    expect(idleSettled).toBe(true);
  });

  it('rejects a bounded arm when no future refresh activity arrives', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    const armed = armWorkspaceRefreshIdleWait(
      provider as never,
      { quietMs: 32, timeoutMs: 50 },
    );
    const rejection = expect(armed.promise).rejects.toThrow(
      'Timed out waiting for future workspace refresh activity to begin',
    );

    await vi.advanceTimersByTimeAsync(50);
    await rejection;
  });

  it('starts a fresh settlement window when future refresh activity arrives', async () => {
    vi.useFakeTimers();
    let resolveRefresh!: () => void;
    const refreshDone = new Promise<void>(resolve => {
      resolveRefresh = resolve;
    });
    const provider = makeProvider();
    provider.refreshChangedFiles.mockReturnValue(refreshDone);
    const armed = armWorkspaceRefreshIdleWait(
      provider as never,
      { quietMs: 10, timeoutMs: 50 },
    );
    let outcome: 'pending' | 'rejected' | 'resolved' = 'pending';
    void armed.promise.then(
      () => { outcome = 'resolved'; },
      () => { outcome = 'rejected'; },
    );

    await vi.advanceTimersByTimeAsync(49);
    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
      0,
    );
    await vi.advanceTimersByTimeAsync(1);

    expect(provider.refreshChangedFiles).toHaveBeenCalledOnce();
    expect(outcome).toBe('pending');

    resolveRefresh();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);

    await expect(armed.promise).resolves.toBeUndefined();
    expect(outcome).toBe('resolved');
  });

  it('times out begun refresh activity from when that activity was observed', async () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    provider.refreshChangedFiles.mockReturnValue(new Promise<void>(() => {}));
    const armed = armWorkspaceRefreshIdleWait(
      provider as never,
      { timeoutMs: 50 },
    );
    let rejection: unknown;
    void armed.promise.catch((error: unknown) => {
      rejection = error;
    });

    await vi.advanceTimersByTimeAsync(40);
    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
      0,
    );
    await vi.advanceTimersByTimeAsync(49);

    expect(provider.refreshChangedFiles).toHaveBeenCalledOnce();
    expect(rejection).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);

    expect(rejection).toEqual(
      new Error('Timed out waiting for workspace refresh activity to settle'),
    );
  });
});
