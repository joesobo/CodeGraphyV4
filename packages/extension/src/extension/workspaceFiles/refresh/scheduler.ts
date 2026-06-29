import type { GraphViewProvider } from '../../graphViewProvider';

interface PendingWorkspaceRefresh {
  filePaths: Set<string>;
  followUpDelayMs?: number;
  fullRefresh: boolean;
  gitignoreRefresh: boolean;
  logMessage: string;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingWorkspaceRefreshes = new WeakMap<GraphViewProvider, PendingWorkspaceRefresh>();

function isGraphOpen(provider: GraphViewProvider): boolean {
  return provider.isGraphOpen?.() ?? true;
}

function markWorkspaceRefreshPending(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[],
  options: { gitignoreRefresh?: boolean } = {},
): void {
  if (options.gitignoreRefresh !== true) {
    provider.markWorkspaceRefreshPending?.(logMessage, filePaths);
    return;
  }

  provider.markWorkspaceRefreshPending?.(logMessage, filePaths, options);
}

export function scheduleWorkspaceRefresh(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[] = [],
  delayMs: number = 500,
  options: { followUpDelayMs?: number; fullRefresh?: boolean; gitignoreRefresh?: boolean } = {},
): void {
  const nextFilePaths = new Set(filePaths);
  let followUpDelayMs = options.followUpDelayMs;
  let fullRefresh = options.fullRefresh === true;
  let gitignoreRefresh = options.gitignoreRefresh === true;

  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(provider, logMessage, [...nextFilePaths], {
      gitignoreRefresh,
    });
    return;
  }

  const pending = pendingWorkspaceRefreshes.get(provider);
  if (pending) {
    clearTimeout(pending.timeout);
    followUpDelayMs = maxFollowUpDelay(followUpDelayMs, pending.followUpDelayMs);
    fullRefresh = fullRefresh || pending.fullRefresh;
    gitignoreRefresh = gitignoreRefresh || pending.gitignoreRefresh;
    for (const filePath of pending.filePaths) {
      nextFilePaths.add(filePath);
    }
  }

  const nextPending: PendingWorkspaceRefresh = {
    filePaths: nextFilePaths,
    followUpDelayMs,
    fullRefresh,
    gitignoreRefresh,
    logMessage,
    timeout: setTimeout(() => {
      pendingWorkspaceRefreshes.delete(provider);
      if (!isGraphOpen(provider)) {
        markWorkspaceRefreshPending(
          provider,
          nextPending.logMessage,
          [...nextPending.filePaths],
          { gitignoreRefresh: nextPending.gitignoreRefresh },
        );
        return;
      }

      console.log(nextPending.logMessage);
      if (nextPending.gitignoreRefresh) {
        if (provider.refreshGitignoreMetadata) {
          void provider.refreshGitignoreMetadata();
          scheduleWorkspaceRefreshFollowUp(provider, nextPending);
          return;
        }
        if (provider.refreshIndex) {
          void provider.refreshIndex();
          scheduleWorkspaceRefreshFollowUp(provider, nextPending);
          return;
        }
      }

      if (nextPending.fullRefresh) {
        if (provider.refreshIndex) {
          void provider.refreshIndex();
          scheduleWorkspaceRefreshFollowUp(provider, nextPending);
          return;
        }
        void provider.refresh();
        scheduleWorkspaceRefreshFollowUp(provider, nextPending);
        return;
      }

      if (provider.refreshChangedFiles) {
        void provider.refreshChangedFiles([...nextPending.filePaths]);
        scheduleWorkspaceRefreshFollowUp(provider, nextPending);
        return;
      }

      provider.invalidateWorkspaceFiles?.([...nextPending.filePaths]);
      void provider.refresh();
      scheduleWorkspaceRefreshFollowUp(provider, nextPending);
    }, delayMs),
  };

  pendingWorkspaceRefreshes.set(provider, nextPending);
}

function maxFollowUpDelay(
  left: number | undefined,
  right: number | undefined,
): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.max(left, right);
}

function scheduleWorkspaceRefreshFollowUp(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
): void {
  if (pending.followUpDelayMs === undefined) {
    return;
  }

  setTimeout(() => {
    scheduleWorkspaceRefresh(
      provider,
      pending.logMessage,
      [...pending.filePaths],
      0,
      {
        fullRefresh: pending.fullRefresh,
        gitignoreRefresh: pending.gitignoreRefresh,
      },
    );
  }, pending.followUpDelayMs);
}
