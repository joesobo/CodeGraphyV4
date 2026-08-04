import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateSchedulerOptions,
  type WorkspaceCacheUpdateStatus,
} from '../../../../src/extension/workspaceFiles/cacheUpdates/model';
import { WorkspaceCacheUpdateUnrecordedError } from '../../../../src/extension/workspaceFiles/cacheUpdates/error';

describe('workspaceFiles/cacheUpdates/model', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits until targeted updates are eligible and coalesces saved paths', async () => {
    vi.useFakeTimers();
    const update = vi.fn(async () => undefined);
    const statuses: WorkspaceCacheUpdateStatus[] = [];
    let canUpdate = false;
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 500,
      canUpdate: () => canUpdate,
      maxBatchAgeMs: 2_000,
      onStatus: status => statuses.push(status),
      update,
    });

    scheduler.notify(['/workspace/src/a.ts']);
    await vi.advanceTimersByTimeAsync(500);

    expect(update).not.toHaveBeenCalled();
    expect(statuses).toEqual([]);

    canUpdate = true;
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
      canUpdate: () => true,
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

  it('flushes direct Graph View mutations immediately without dropping matching ambient events', async () => {
    vi.useFakeTimers();
    const update = vi.fn<WorkspaceCacheUpdateSchedulerOptions['update']>(async () => undefined);
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 250,
      canUpdate: () => true,
      maxBatchAgeMs: 2_000,
      onStatus: vi.fn(),
      update,
    });

    const immediateUpdate = scheduler.notifyImmediately(['/workspace/src/new.ts']);
    scheduler.notify(['/workspace/src/new.ts']);
    await immediateUpdate;
    await vi.advanceTimersByTimeAsync(250);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0]?.[0]).toEqual(['/workspace/src/new.ts']);
    expect(update.mock.calls[1]?.[0]).toEqual(['/workspace/src/new.ts']);
    scheduler.dispose();
  });

  it('starts an awaited direct update as soon as active work completes', async () => {
    vi.useFakeTimers();
    let finishFirstUpdate!: () => void;
    const firstUpdateGate = new Promise<void>(resolve => {
      finishFirstUpdate = resolve;
    });
    const update = vi.fn<WorkspaceCacheUpdateSchedulerOptions['update']>(async () => {
      if (update.mock.calls.length === 1) await firstUpdateGate;
    });
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 250,
      canUpdate: () => true,
      maxBatchAgeMs: 2_000,
      onStatus: vi.fn(),
      update,
    });

    scheduler.notify(['/workspace/src/ambient.ts']);
    await vi.advanceTimersByTimeAsync(250);
    const immediateUpdate = scheduler.notifyImmediately(['/workspace/src/direct.ts']);
    finishFirstUpdate();
    await immediateUpdate;

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]?.[0]).toEqual(['/workspace/src/direct.ts']);
    scheduler.dispose();
  });

  it('forces a continuously changing batch at its maximum age', async () => {
    vi.useFakeTimers();
    const update = vi.fn(async () => undefined);
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 500,
      canUpdate: () => true,
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
    const onStatus = vi.fn();
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 250,
      canUpdate: () => true,
      maxBatchAgeMs: 2_000,
      onError,
      onStatus,
      update: vi.fn(async () => Promise.reject(error)),
    });

    scheduler.notify(['/workspace/src/app.ts']);
    await vi.advanceTimersByTimeAsync(250);

    expect(onError).toHaveBeenCalledWith(error, ['/workspace/src/app.ts']);
    expect(onStatus).toHaveBeenLastCalledWith({
      state: 'error',
      fileCount: 1,
      error,
    });
    scheduler.dispose();
  });

  it('settles immediate callers only after async failure handling completes', async () => {
    const updateError = new Error('targeted update failed');
    const staleError = new Error('stale mark failed');
    let rejectStaleMark!: (error: unknown) => void;
    const staleMark = new Promise<void>((_resolve, reject) => {
      rejectStaleMark = reject;
    });
    const statuses: WorkspaceCacheUpdateStatus[] = [];
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (error: unknown): void => {
      unhandledRejections.push(error);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 250,
      canUpdate: () => true,
      maxBatchAgeMs: 2_000,
      onError: async () => staleMark,
      onStatus: status => statuses.push(status),
      update: vi.fn(async () => Promise.reject(updateError)),
    });

    try {
      let callerSettled = false;
      const callerOutcome = scheduler
        .notifyImmediately(['/workspace/src/app.ts'])
        .then(
          () => undefined,
          error => error,
        )
        .then(error => {
          callerSettled = true;
          return error;
        });

      await vi.waitFor(() => {
        expect(statuses.map(status => status.state)).toEqual(['queued', 'updating']);
      });
      expect(callerSettled).toBe(false);

      rejectStaleMark(staleError);
      const callerError = await callerOutcome;
      await new Promise<void>(resolve => setImmediate(resolve));

      expect(callerError).toBeInstanceOf(WorkspaceCacheUpdateUnrecordedError);
      expect((callerError as WorkspaceCacheUpdateUnrecordedError).errors)
        .toEqual([updateError, staleError]);
      expect(statuses).toContainEqual({
        state: 'error',
        fileCount: 1,
        error: callerError,
      });
      expect(unhandledRejections).toEqual([]);
    } finally {
      scheduler.dispose();
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });

  it('reports normalized progress as structural scheduler data', async () => {
    vi.useFakeTimers();
    const statuses: WorkspaceCacheUpdateStatus[] = [];
    const scheduler = createWorkspaceCacheUpdateScheduler({
      debounceMs: 250,
      canUpdate: () => true,
      maxBatchAgeMs: 2_000,
      onStatus: status => statuses.push(status),
      update: vi.fn(async (_filePaths, _signal, onProgress) => {
        onProgress({ phase: 'Applying Changes', current: 4, total: 3 });
      }),
    });

    scheduler.notify(['/workspace/src/app.ts']);
    await vi.advanceTimersByTimeAsync(250);

    expect(statuses).toContainEqual({
      state: 'updating',
      fileCount: 1,
      progress: { phase: 'Applying Changes', current: 3, total: 3 },
    });
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
      canUpdate: () => true,
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
