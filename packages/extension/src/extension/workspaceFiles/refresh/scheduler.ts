import type { GraphViewProvider } from '../../graphViewProvider';
import type { PendingWorkspaceRefresh } from './contracts';
import { executeWorkspaceRefresh, isGraphOpen } from './execution';
import { mergePendingRefresh } from './pending';

const pendingWorkspaceRefreshes = new WeakMap<GraphViewProvider, PendingWorkspaceRefresh>();

function warnWorkspaceCacheUpdate(error: unknown): void {
  console.warn('[CodeGraphy] Failed to update the persisted Graph Cache.', error);
}

function runScheduledRefresh(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
): void {
  pendingWorkspaceRefreshes.delete(provider);
  if (!isGraphOpen(provider) && provider.refreshPersistedWorkspaceCache) {
    void provider.refreshPersistedWorkspaceCache([...pending.filePaths])
      .then(() => scheduleWorkspaceRefreshFollowUp(provider, pending))
      .catch(warnWorkspaceCacheUpdate);
    return;
  }

  const released = provider.releasePersistedWorkspaceCacheUpdater?.();
  if (released !== undefined) {
    void released.then(() => {
      executeWorkspaceRefresh(provider, pending);
      scheduleWorkspaceRefreshFollowUp(provider, pending);
    }).catch(warnWorkspaceCacheUpdate);
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
