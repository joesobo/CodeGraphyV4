import { WorkspaceCacheUpdateUnrecordedError } from './error';

export type WorkspaceCacheUpdateStatus =
  | { state: 'queued'; fileCount: number }
  | { state: 'updating'; fileCount: number; progress?: WorkspaceCacheUpdateProgress }
  | { state: 'idle'; fileCount: 0 }
  | { state: 'error'; fileCount: number; error: unknown };

export interface WorkspaceCacheUpdateProgress {
  phase: string;
  current: number;
  total: number;
}

export interface WorkspaceCacheUpdateSchedulerOptions {
  debounceMs: number;
  canUpdate(): boolean;
  maxBatchAgeMs: number;
  onError?(error: unknown, filePaths: readonly string[]): Promise<void> | void;
  onStatus(status: WorkspaceCacheUpdateStatus): void;
  update(
    filePaths: readonly string[],
    signal: AbortSignal,
    onProgress: (progress: WorkspaceCacheUpdateProgress) => void,
  ): Promise<void>;
}

export interface WorkspaceCacheUpdateScheduler {
  dispose(): void;
  notify(filePaths: readonly string[]): void;
  notifyImmediately(filePaths: readonly string[]): Promise<void>;
}

class WorkspaceCacheUpdateSchedulerState implements WorkspaceCacheUpdateScheduler {
  private activeController: AbortController | undefined;
  private activeUpdate: Promise<void> | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private maxBatchAgeTimer: ReturnType<typeof setTimeout> | undefined;
  private nextRevision = 0;
  private pendingRevision = 0;
  private pendingImmediateUpdate = false;
  private readonly pendingFilePaths = new Set<string>();
  private readonly revisionWaiters: Array<{
    reject(error: unknown): void;
    resolve(): void;
    revision: number;
  }> = [];

  constructor(private readonly options: WorkspaceCacheUpdateSchedulerOptions) {}

  notify(filePaths: readonly string[]): void {
    if (this.enqueue(filePaths) === undefined) return;
    this.options.onStatus(createQueuedStatus(this.pendingFilePaths.size));
    this.schedule();
  }

  notifyImmediately(filePaths: readonly string[]): Promise<void> {
    const revision = this.enqueue(filePaths);
    if (revision === undefined) return Promise.resolve();
    this.pendingImmediateUpdate = true;
    this.options.onStatus(createQueuedStatus(this.pendingFilePaths.size));
    this.clearTimers();
    this.startUpdate();
    return new Promise<void>((resolve, reject) => {
      this.revisionWaiters.push({ reject, resolve, revision });
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.pendingFilePaths.clear();
    this.clearTimers();
    this.activeController?.abort();
    this.rejectWaiters(Number.POSITIVE_INFINITY, new Error('Workspace cache updater disposed.'));
  }

  private enqueue(filePaths: readonly string[]): number | undefined {
    if (this.disposed || !this.options.canUpdate() || filePaths.length === 0) {
      return undefined;
    }
    const revision = ++this.nextRevision;
    this.pendingRevision = revision;
    for (const filePath of filePaths) {
      this.pendingFilePaths.add(filePath);
    }
    return revision;
  }

  private schedule(): void {
    if (this.activeUpdate) {
      return;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.startUpdate(), this.options.debounceMs);
    this.maxBatchAgeTimer ??= setTimeout(
      () => this.startUpdate(),
      this.options.maxBatchAgeMs,
    );
  }

  private startUpdate(): void {
    if (this.disposed || this.activeUpdate || this.pendingFilePaths.size === 0) {
      return;
    }
    this.clearTimers();
    const filePaths: string[] = [...this.pendingFilePaths];
    const revision = this.pendingRevision;
    this.pendingFilePaths.clear();
    this.pendingImmediateUpdate = false;
    const controller = new AbortController();
    this.activeController = controller;
    this.options.onStatus(createUpdatingStatus(filePaths.length));
    this.activeUpdate = this.runUpdate(filePaths, revision, controller);
  }

  private async runUpdate(
    filePaths: readonly string[],
    revision: number,
    controller: AbortController,
  ): Promise<void> {
    try {
      await this.options.update(
        filePaths,
        controller.signal,
        progress => this.reportProgress(filePaths.length, progress),
      );
      this.resolveWaiters(revision);
      if (!this.disposed && this.pendingFilePaths.size === 0) {
        this.options.onStatus({
          state: 'idle',
          fileCount: 0,
        });
      }
    } catch (updateError: unknown) {
      if (!this.disposed && !controller.signal.aborted) {
        let reportedError = updateError;
        try {
          await this.options.onError?.(updateError, filePaths);
        } catch (staleMarkError: unknown) {
          reportedError = new WorkspaceCacheUpdateUnrecordedError(
            updateError,
            staleMarkError,
          );
        }
        if (!this.disposed && !controller.signal.aborted) {
          this.options.onStatus({
            state: 'error',
            fileCount: filePaths.length,
            error: reportedError,
          });
          this.rejectWaiters(revision, reportedError);
        }
      }
    } finally {
      if (this.activeController === controller) {
        this.activeController = undefined;
        this.activeUpdate = undefined;
      }
      if (!this.disposed && this.pendingFilePaths.size > 0) {
        this.options.onStatus(createQueuedStatus(this.pendingFilePaths.size));
        if (this.pendingImmediateUpdate) {
          this.startUpdate();
        } else {
          this.schedule();
        }
      }
    }
  }

  private resolveWaiters(revision: number): void {
    for (let index = this.revisionWaiters.length - 1; index >= 0; index -= 1) {
      const waiter = this.revisionWaiters[index];
      if (waiter && waiter.revision <= revision) {
        this.revisionWaiters.splice(index, 1);
        waiter.resolve();
      }
    }
  }

  private rejectWaiters(revision: number, error: unknown): void {
    for (let index = this.revisionWaiters.length - 1; index >= 0; index -= 1) {
      const waiter = this.revisionWaiters[index];
      if (waiter && waiter.revision <= revision) {
        this.revisionWaiters.splice(index, 1);
        waiter.reject(error);
      }
    }
  }

  private reportProgress(
    fileCount: number,
    progress: WorkspaceCacheUpdateProgress,
  ): void {
    if (this.disposed) {
      return;
    }
    const total = Math.max(1, progress.total);
    const current = Math.min(total, Math.max(0, progress.current));
    this.options.onStatus({
      state: 'updating',
      fileCount,
      progress: { phase: progress.phase, current, total },
    });
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.maxBatchAgeTimer) {
      clearTimeout(this.maxBatchAgeTimer);
    }
    this.debounceTimer = undefined;
    this.maxBatchAgeTimer = undefined;
  }
}

function createQueuedStatus(fileCount: number): WorkspaceCacheUpdateStatus {
  return {
    state: 'queued',
    fileCount,
  };
}

function createUpdatingStatus(fileCount: number): WorkspaceCacheUpdateStatus {
  return {
    state: 'updating',
    fileCount,
  };
}

export function createWorkspaceCacheUpdateScheduler(
  options: WorkspaceCacheUpdateSchedulerOptions,
): WorkspaceCacheUpdateScheduler {
  return new WorkspaceCacheUpdateSchedulerState(options);
}
