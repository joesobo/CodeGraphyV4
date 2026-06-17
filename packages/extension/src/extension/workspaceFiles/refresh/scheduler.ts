import type { GraphViewProvider } from '../../graphViewProvider';

interface PendingWorkspaceRefresh {
  filePaths: Set<string>;
  fullRefresh: boolean;
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
): void {
  provider.markWorkspaceRefreshPending?.(logMessage, filePaths);
}

export function scheduleWorkspaceRefresh(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[] = [],
  delayMs: number = 500,
  options: { fullRefresh?: boolean } = {},
): void {
  const nextFilePaths = new Set(filePaths);
  let fullRefresh = options.fullRefresh === true;

  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(provider, logMessage, [...nextFilePaths]);
    return;
  }

  const pending = pendingWorkspaceRefreshes.get(provider);
  if (pending) {
    clearTimeout(pending.timeout);
    fullRefresh = fullRefresh || pending.fullRefresh;
    for (const filePath of pending.filePaths) {
      nextFilePaths.add(filePath);
    }
  }

  const nextPending: PendingWorkspaceRefresh = {
    filePaths: nextFilePaths,
    fullRefresh,
    logMessage,
    timeout: setTimeout(() => {
      pendingWorkspaceRefreshes.delete(provider);
      if (!isGraphOpen(provider)) {
        markWorkspaceRefreshPending(
          provider,
          nextPending.logMessage,
          [...nextPending.filePaths],
        );
        return;
      }

      console.log(nextPending.logMessage);
      if (nextPending.fullRefresh) {
        if (provider.refreshIndex) {
          void provider.refreshIndex();
          return;
        }
        void provider.refresh();
        return;
      }

      if (provider.refreshChangedFiles) {
        void provider.refreshChangedFiles([...nextPending.filePaths]);
        return;
      }

      provider.invalidateWorkspaceFiles?.([...nextPending.filePaths]);
      void provider.refresh();
    }, delayMs),
  };

  pendingWorkspaceRefreshes.set(provider, nextPending);
}
