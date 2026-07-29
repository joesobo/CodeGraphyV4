import {
  createCodeGraphyWorkspaceCacheUpdater,
  subscribeCodeGraphyWorkspaceChanges,
  type CodeGraphyWorkspaceCacheUpdateEvent,
  type CodeGraphyWorkspaceCacheUpdater,
  type CodeGraphyWorkspaceCacheUpdaterOptions,
  type SubscribeCodeGraphyWorkspaceChangesOptions,
} from '../../indexing/workspace';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import type { CommandExecutionResult } from '../command';

const EVENT_PATH_LIMIT = 20;

export interface WatchCommandEvent extends Record<string, unknown> {
  event: 'error' | 'ready' | 'stopped' | 'updated' | 'updating';
}

export interface WatchCommandDependencies {
  createUpdater(options: CodeGraphyWorkspaceCacheUpdaterOptions): CodeGraphyWorkspaceCacheUpdater;
  cwd(): string;
  subscribe(
    options: SubscribeCodeGraphyWorkspaceChangesOptions,
  ): ReturnType<typeof subscribeCodeGraphyWorkspaceChanges>;
  waitForStop(signal?: AbortSignal): Promise<void>;
}

export interface WatchCommandOptions {
  writeEvent?(event: WatchCommandEvent): void;
}

function waitForProcessStop(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const stop = (): void => {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      signal?.removeEventListener('abort', stop);
      resolve();
    };
    if (signal?.aborted) {
      stop();
      return;
    }
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    signal?.addEventListener('abort', stop, { once: true });
  });
}

const DEFAULT_DEPENDENCIES: WatchCommandDependencies = {
  createUpdater: createCodeGraphyWorkspaceCacheUpdater,
  cwd: () => process.cwd(),
  subscribe: subscribeCodeGraphyWorkspaceChanges,
  waitForStop: waitForProcessStop,
};

function summarizePaths(filePaths: readonly string[]): Record<string, unknown> {
  return {
    filePaths: filePaths.slice(0, EVENT_PATH_LIMIT),
    totalFiles: filePaths.length,
    complete: filePaths.length <= EVENT_PATH_LIMIT,
  };
}

function toWatchCommandEvent(event: CodeGraphyWorkspaceCacheUpdateEvent): WatchCommandEvent {
  switch (event.type) {
    case 'ready':
      return {
        event: 'ready',
        workspaceRoot: event.result.workspaceRoot,
        graphCachePath: event.result.graphCachePath,
        indexedFiles: event.result.files.length,
        totalFound: event.result.totalFound,
        limitReached: event.result.limitReached,
        indexing: event.result.indexing,
      };
    case 'updating':
      return { event: 'updating', ...summarizePaths(event.filePaths) };
    case 'updated':
      return {
        event: 'updated',
        durationMs: event.durationMs,
        indexing: event.result.indexing,
        ...summarizePaths(event.filePaths),
      };
    case 'error':
      return {
        event: 'error',
        code: 'watch_update_failed',
        message: event.error instanceof Error ? event.error.message : String(event.error),
        ...summarizePaths(event.filePaths),
      };
  }
}

export async function runWatchCommand(
  workspacePath?: string,
  dependencies: WatchCommandDependencies = DEFAULT_DEPENDENCIES,
  options: WatchCommandOptions = {},
): Promise<CommandExecutionResult> {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(workspacePath, dependencies.cwd());
  const emit = (event: WatchCommandEvent): void => options.writeEvent?.(event);
  const startupFilePaths = new Set<string>();
  let ready = false;
  const updater = dependencies.createUpdater({
    workspaceRoot,
    onEvent: event => emit(toWatchCommandEvent(event)),
  });
  const stopController = new AbortController();
  const stopPromise = dependencies.waitForStop(stopController.signal);
  try {
    const subscription = await dependencies.subscribe({
      workspaceRoot,
      onEvents: (events) => {
        const filePaths = events.map(event => event.path);
        if (ready) {
          updater.notify(filePaths);
          return;
        }
        for (const filePath of filePaths) startupFilePaths.add(filePath);
      },
      onError: error => emit({
        event: 'error',
        code: 'watch_subscription_failed',
        message: error.message,
      }),
    });

    try {
      await updater.start();
      ready = true;
      updater.notify([...startupFilePaths]);
      await stopPromise;
    } finally {
      await subscription.dispose();
    }
  } finally {
    stopController.abort();
    await updater.dispose();
  }
  emit({ event: 'stopped', workspaceRoot });
  return { exitCode: 0, output: '' };
}
