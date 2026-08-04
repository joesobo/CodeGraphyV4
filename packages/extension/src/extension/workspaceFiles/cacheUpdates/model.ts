export type WorkspaceCacheUpdateStatus =
  | { state: 'queued'; fileCount: number; detail: string }
  | { state: 'updating'; fileCount: number; detail: string }
  | { state: 'idle'; fileCount: 0; detail: string }
  | { state: 'error'; fileCount: number; detail: string };

export interface WorkspaceCacheUpdateProgress {
  phase: string;
  current: number;
  total: number;
}

export interface WorkspaceCacheUpdateSchedulerOptions {
  debounceMs: number;
  hasGraphCache(): boolean;
  maxBatchAgeMs: number;
  onError?(error: unknown, filePaths: readonly string[]): void;
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
}

class WorkspaceCacheUpdateSchedulerState implements WorkspaceCacheUpdateScheduler {
  private activeController: AbortController | undefined;
  private activeUpdate: Promise<void> | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private maxBatchAgeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly pendingFilePaths = new Set<string>();

  constructor(private readonly options: WorkspaceCacheUpdateSchedulerOptions) {}

  notify(filePaths: readonly string[]): void {
    if (this.disposed || !this.options.hasGraphCache()) {
      return;
    }
    for (const filePath of filePaths) {
      this.pendingFilePaths.add(filePath);
    }
    if (this.pendingFilePaths.size === 0) {
      return;
    }
    this.options.onStatus(createQueuedStatus(this.pendingFilePaths.size));
    this.schedule();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.pendingFilePaths.clear();
    this.clearTimers();
    this.activeController?.abort();
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
    this.pendingFilePaths.clear();
    const controller = new AbortController();
    this.activeController = controller;
    this.options.onStatus(createUpdatingStatus(filePaths.length));
    this.activeUpdate = this.options.update(
      filePaths,
      controller.signal,
      progress => this.reportProgress(filePaths.length, progress),
    );
    void this.activeUpdate
      .then(() => {
        if (!this.disposed && this.pendingFilePaths.size === 0) {
          this.options.onStatus({
            state: 'idle',
            fileCount: 0,
            detail: 'Graph Cache is current.',
          });
        }
      })
      .catch((error: unknown) => {
        if (!this.disposed && !controller.signal.aborted) {
          this.options.onError?.(error, filePaths);
          this.options.onStatus({
            state: 'error',
            fileCount: filePaths.length,
            detail: `Graph Cache update failed: ${formatError(error)}`,
          });
        }
      })
      .finally(() => {
        if (this.activeController === controller) {
          this.activeController = undefined;
          this.activeUpdate = undefined;
        }
        if (!this.disposed && this.pendingFilePaths.size > 0) {
          this.options.onStatus(createQueuedStatus(this.pendingFilePaths.size));
          this.schedule();
        }
      });
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
      detail: `${progress.phase}: ${current} of ${total}.`,
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
    detail: fileCount === 1
      ? '1 workspace file change is queued for Graph Cache update.'
      : `${fileCount} workspace file changes are queued for Graph Cache update.`,
  };
}

function createUpdatingStatus(fileCount: number): WorkspaceCacheUpdateStatus {
  return {
    state: 'updating',
    fileCount,
    detail: fileCount === 1
      ? 'Updating the Graph Cache for 1 workspace file.'
      : `Updating the Graph Cache for ${fileCount} workspace files.`,
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createWorkspaceCacheUpdateScheduler(
  options: WorkspaceCacheUpdateSchedulerOptions,
): WorkspaceCacheUpdateScheduler {
  return new WorkspaceCacheUpdateSchedulerState(options);
}
