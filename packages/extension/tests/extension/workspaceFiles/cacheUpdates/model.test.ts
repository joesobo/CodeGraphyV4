import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateSchedulerOptions,
  type WorkspaceCacheUpdateStatus,
} from '../../../../src/extension/workspaceFiles/cacheUpdates/model';

describe('workspaceFiles/cacheUpdates/model', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for an existing Graph Cache and coalesces saved paths', async () => {
    vi.useFakeTimers();
    const update = vi.fn(async () => undefined);
    const statuses: WorkspaceCacheUpdateStatus[] = [];
    let hasGraphCache = false;
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 500,
      hasGraphCache: () => hasGraphCache,
      maxBatchAgeMs: 2_000,
      onStatus: status => statuses.push(status),
      update,
    });

    scheduler.notify(['/workspace/src/a.ts']);
    await vi.advanceTimersByTimeAsync(500);

    expect(update).not.toHaveBeenCalled();
    expect(statuses).toEqual([]);

    hasGraphCache = true;
    scheduler.notify([
      '/workspace/src/a.ts',
      '/workspace/src/b.ts',
      '/workspace/src/a.ts',
    ]);
    await vi.advanceTimersByTimeAsync(499);

    expect(update).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toEqual({
      state: 'queued',
      fileCount: 2,
      detail: '2 workspace file changes are queued for Graph Cache update.',
    });

    await vi.advanceTimersByTimeAsync(1);

    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(
      ['/workspace/src/a.ts', '/workspace/src/b.ts'],
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(statuses.at(-1)).toEqual({
      state: 'idle',
      fileCount: 0,
      detail: 'Graph Cache is current.',
    });

    scheduler.dispose();
  });

  it('serializes updates and retains saves that arrive during active work', async () => {
    vi.useFakeTimers();
    let finishFirstUpdate!: () => void;
    const firstUpdateGate = new Promise<void>((resolve) => {
      finishFirstUpdate = resolve;
    });
    const update = vi.fn<WorkspaceCacheUpdateSchedulerOptions['update']>(async () => {
      if (update.mock.calls.length === 1) {
        await firstUpdateGate;
      }
    });
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 500,
      hasGraphCache: () => true,
      maxBatchAgeMs: 2_000,
      onStatus: vi.fn(),
      update,
    });

    scheduler.notify(['/workspace/src/a.ts']);
    await vi.advanceTimersByTimeAsync(500);
    scheduler.notify(['/workspace/src/b.ts']);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(update).toHaveBeenCalledOnce();

    finishFirstUpdate();
    await vi.advanceTimersByTimeAsync(500);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]?.[0]).toEqual(['/workspace/src/b.ts']);

    scheduler.dispose();
  });

  it('forces a continuously changing batch at its maximum age', async () => {
    vi.useFakeTimers();
    const update = vi.fn(async () => undefined);
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 500,
      hasGraphCache: () => true,
      maxBatchAgeMs: 1_000,
      onStatus: vi.fn(),
      update,
    });

    scheduler.notify(['/workspace/src/a.ts']);
    await vi.advanceTimersByTimeAsync(400);
    scheduler.notify(['/workspace/src/a.ts']);
    await vi.advanceTimersByTimeAsync(400);
    scheduler.notify(['/workspace/src/a.ts']);
    await vi.advanceTimersByTimeAsync(200);

    expect(update).toHaveBeenCalledOnce();

    scheduler.dispose();
  });

  it('reports failed paths so the index can be marked stale', async () => {
    vi.useFakeTimers();
    const error = new Error('targeted update requires explicit Re-index');
    const onError = vi.fn();
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 250,
      hasGraphCache: () => true,
      maxBatchAgeMs: 2_000,
      onError,
      onStatus: vi.fn(),
      update: vi.fn(async () => Promise.reject(error)),
    });

    scheduler.notify(['/workspace/src/app.ts']);
    await vi.advanceTimersByTimeAsync(250);

    expect(onError).toHaveBeenCalledWith(error, ['/workspace/src/app.ts']);
    scheduler.dispose();
  });

  it('cancels active work and drops pending saves when disposed', async () => {
    vi.useFakeTimers();
    let updateSignal: AbortSignal | undefined;
    const update = vi.fn(async (
      _filePaths: readonly string[],
      signal: AbortSignal,
    ) => {
      updateSignal = signal;
      await new Promise<void>(() => undefined);
    });
    const onStatus = vi.fn();
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 500,
      hasGraphCache: () => true,
      maxBatchAgeMs: 2_000,
      onStatus,
      update,
    });

    scheduler.notify(['/workspace/src/a.ts']);
    await vi.advanceTimersByTimeAsync(500);
    scheduler.notify(['/workspace/src/b.ts']);
    scheduler.dispose();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(updateSignal?.aborted).toBe(true);
    expect(update).toHaveBeenCalledOnce();
    expect(onStatus).not.toHaveBeenCalledWith(expect.objectContaining({ state: 'error' }));
  });
});
