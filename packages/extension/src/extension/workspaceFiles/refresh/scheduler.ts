import type { GraphViewProvider } from '../../graphViewProvider';

interface PendingWorkspaceRefresh {
  filePaths: Set<string>;
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
  options: { fullRefresh?: boolean; gitignoreRefresh?: boolean } = {},
): void {
  const nextFilePaths = new Set(filePaths);
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
    fullRefresh = fullRefresh || pending.fullRefresh;
    gitignoreRefresh = gitignoreRefresh || pending.gitignoreRefresh;
    for (const filePath of pending.filePaths) {
      nextFilePaths.add(filePath);
    }
  }

  const nextPending: PendingWorkspaceRefresh = {
    filePaths: nextFilePaths,
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
          return;
        }
        if (provider.refreshIndex) {
          void provider.refreshIndex();
          return;
        }
      }

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
