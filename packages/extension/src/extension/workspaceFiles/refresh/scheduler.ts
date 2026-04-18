import type { GraphViewProvider } from '../../graphViewProvider';

interface PendingWorkspaceRefresh {
  filePaths: Set<string>;
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
): void {
  const nextFilePaths = new Set(filePaths);

  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(provider, logMessage, [...nextFilePaths]);
    return;
  }

  const pending = pendingWorkspaceRefreshes.get(provider);
  if (pending) {
    clearTimeout(pending.timeout);
    for (const filePath of pending.filePaths) {
      nextFilePaths.add(filePath);
    }
  }

  const nextPending: PendingWorkspaceRefresh = {
    filePaths: nextFilePaths,
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
