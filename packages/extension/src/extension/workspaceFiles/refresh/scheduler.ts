import type { GraphViewProvider } from '../../graphViewProvider';
import type { PendingWorkspaceRefresh } from './contracts';
import {
  executeWorkspaceRefresh,
  isGraphOpen,
  markWorkspaceRefreshPending,
} from './execution';
import { mergePendingRefresh } from './pending';

const pendingWorkspaceRefreshes = new WeakMap<GraphViewProvider, PendingWorkspaceRefresh>();

function runScheduledRefresh(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
): void {
  pendingWorkspaceRefreshes.delete(provider);
  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(provider, pending);
    return;
  }
  executeWorkspaceRefresh(provider, pending);
  scheduleWorkspaceRefreshFollowUp(provider, pending);
}

export function scheduleWorkspaceRefresh(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[] = [],
  delayMs: number = 500,
  options: { followUpDelayMs?: number; fullRefresh?: boolean; gitignoreRefresh?: boolean } = {},
): void {
  const nextFiles = new Set(filePaths);
  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(provider, {
      filePaths: nextFiles,
      gitignoreRefresh: options.gitignoreRefresh === true,
      logMessage,
    });
    return;
  }
  const merged = mergePendingRefresh(
    pendingWorkspaceRefreshes.get(provider),
    nextFiles,
    options,
  );
  const nextPending: PendingWorkspaceRefresh = {
    ...merged,
    logMessage,
    timeout: setTimeout(() => runScheduledRefresh(provider, nextPending), delayMs),
  };
  pendingWorkspaceRefreshes.set(provider, nextPending);
}

function scheduleWorkspaceRefreshFollowUp(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
): void {
  if (pending.followUpDelayMs === undefined) return;
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
