import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from '../contracts';
import { createCodeGraphyWorkspaceEngine } from '../engine';

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_MAX_BATCH_AGE_MS = 2_000;

export type CodeGraphyWorkspaceCacheUpdateEvent =
  | { type: 'ready'; result: IndexCodeGraphyWorkspaceResult }
  | { type: 'updating'; filePaths: readonly string[] }
  | {
      type: 'updated';
      durationMs: number;
      filePaths: readonly string[];
      result: IndexCodeGraphyWorkspaceResult;
    }
  | { type: 'error'; error: unknown; filePaths: readonly string[] };

export interface CodeGraphyWorkspaceCacheUpdaterOptions extends IndexCodeGraphyWorkspaceOptions {
  debounceMs?: number;
  maxBatchAgeMs?: number;
  onEvent?: (event: CodeGraphyWorkspaceCacheUpdateEvent) => void;
}

export interface CodeGraphyWorkspaceCacheUpdater {
  dispose(): Promise<void>;
  notify(filePaths: readonly string[]): void;
  start(): Promise<IndexCodeGraphyWorkspaceResult>;
}

export function createCodeGraphyWorkspaceCacheUpdater(
  options: CodeGraphyWorkspaceCacheUpdaterOptions,
): CodeGraphyWorkspaceCacheUpdater {
  const engine = createCodeGraphyWorkspaceEngine(options);
  const pendingFilePaths = new Set<string>();
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const maxBatchAgeMs = options.maxBatchAgeMs ?? DEFAULT_MAX_BATCH_AGE_MS;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let maxBatchAgeTimer: ReturnType<typeof setTimeout> | undefined;
  let acceptingChanges = true;
  let disposed = false;
  let flushRequested = false;
  let disposePromise: Promise<void> | undefined;
  let startPromise: Promise<IndexCodeGraphyWorkspaceResult> | undefined;
  let updatePromise: Promise<void> | undefined;

  const emit = (event: CodeGraphyWorkspaceCacheUpdateEvent): void => {
    options.onEvent?.(event);
  };
  const start = (): Promise<IndexCodeGraphyWorkspaceResult> => {
    if (disposed) {
      return Promise.reject(new Error('CodeGraphy Workspace cache updater is disposed.'));
    }
    startPromise ??= engine.index().then((result) => {
      emit({ type: 'ready', result });
      return result;
    });
    return startPromise;
  };
  const clearBatchTimers = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (maxBatchAgeTimer) clearTimeout(maxBatchAgeTimer);
    debounceTimer = undefined;
    maxBatchAgeTimer = undefined;
  };
  const requestUpdate = (): void => {
    clearBatchTimers();
    if (updatePromise) {
      flushRequested = true;
      return;
    }
    void update();
  };
  const schedule = (): void => {
    if (disposed || pendingFilePaths.size === 0) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(requestUpdate, debounceMs);
    maxBatchAgeTimer ??= setTimeout(requestUpdate, maxBatchAgeMs);
  };
  const update = async (): Promise<void> => {
    if (disposed || pendingFilePaths.size === 0) return;
    if (updatePromise) {
      flushRequested = true;
      return;
    }
    clearBatchTimers();
    const filePaths = [...pendingFilePaths];
    pendingFilePaths.clear();
    updatePromise = (async () => {
      await start();
      emit({ type: 'updating', filePaths });
      const startedAt = performance.now();
      try {
        const result = await engine.applyChangedFiles(filePaths);
        emit({
          type: 'updated',
          durationMs: performance.now() - startedAt,
          filePaths,
          result,
        });
      } catch (error) {
        emit({ type: 'error', error, filePaths });
      }
    })();
    try {
      await updatePromise;
    } finally {
      updatePromise = undefined;
      if (flushRequested && pendingFilePaths.size > 0) {
        flushRequested = false;
        void update();
      } else {
        flushRequested = false;
        schedule();
      }
    }
  };
  const notify = (filePaths: readonly string[]): void => {
    if (!acceptingChanges) return;
    for (const filePath of filePaths) pendingFilePaths.add(filePath);
    schedule();
  };
  const dispose = (): Promise<void> => {
    disposePromise ??= (async () => {
      acceptingChanges = false;
      clearBatchTimers();
      while (pendingFilePaths.size > 0 || updatePromise) {
        if (!updatePromise && pendingFilePaths.size > 0) await update();
        const activeUpdate = updatePromise;
        if (activeUpdate) await activeUpdate;
      }
      clearBatchTimers();
      disposed = true;
      engine.dispose();
    })();
    return disposePromise;
  };

  return { dispose, notify, start };
}
