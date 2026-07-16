import type { GraphViewProvider } from '../../graphViewProvider';
import type { PendingWorkspaceRefresh } from './contracts';

export function isGraphOpen(provider: GraphViewProvider): boolean {
  return provider.isGraphOpen?.() ?? true;
}

export function markWorkspaceRefreshPending(
  provider: GraphViewProvider,
  pending: Pick<PendingWorkspaceRefresh, 'filePaths' | 'gitignoreRefresh' | 'logMessage'>,
): void {
  const filePaths = [...pending.filePaths];
  if (pending.gitignoreRefresh) {
    provider.markWorkspaceRefreshPending?.(pending.logMessage, filePaths, {
      gitignoreRefresh: true,
    });
    return;
  }
  provider.markWorkspaceRefreshPending?.(pending.logMessage, filePaths);
}

function executeGitignoreRefresh(provider: GraphViewProvider): boolean {
  if (provider.refreshGitignoreMetadata) {
    void provider.refreshGitignoreMetadata();
    return true;
  }
  if (provider.refreshIndex) {
    void provider.refreshIndex();
    return true;
  }
  return false;
}

function executeFullRefresh(provider: GraphViewProvider): void {
  if (provider.refreshIndex) {
    void provider.refreshIndex();
    return;
  }
  void provider.refresh();
}

function executeChangedFileRefresh(
  provider: GraphViewProvider,
  filePaths: readonly string[],
): void {
  if (provider.refreshChangedFiles) {
    void provider.refreshChangedFiles([...filePaths]);
    return;
  }
  provider.invalidateWorkspaceFiles?.([...filePaths]);
  void provider.refresh();
}

export function executeWorkspaceRefresh(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
): void {
  console.log(pending.logMessage);
  if (pending.gitignoreRefresh && executeGitignoreRefresh(provider)) return;
  if (pending.fullRefresh) {
    executeFullRefresh(provider);
    return;
  }
  executeChangedFileRefresh(provider, [...pending.filePaths]);
}
