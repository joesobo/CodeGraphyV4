import type { WorkspacePipeline } from '../../../../pipeline/service/lifecycleFacade';
import type { PendingWorkspaceRefreshState } from '../workspaceRefreshPersistence';

export function invalidateWorkspaceFiles(
  analyzer: WorkspacePipeline | undefined,
  filePaths: readonly string[],
): string[] {
  return analyzer?.invalidateWorkspaceFiles(filePaths) ?? [];
}

export function invalidatePluginFiles(
  analyzer: WorkspacePipeline | undefined,
  pluginIds: readonly string[],
): string[] {
  return analyzer?.invalidatePluginFiles(pluginIds) ?? [];
}

export function mergePendingWorkspaceRefresh(
  currentPending: PendingWorkspaceRefreshState | undefined,
  logMessage: string,
  filePaths: readonly string[] = [],
  options: { gitignoreRefresh?: boolean } = {},
): PendingWorkspaceRefreshState {
  const pending = currentPending ?? {
    filePaths: new Set<string>(),
    gitignoreRefresh: false,
    logMessage,
  };

  pending.logMessage = logMessage;
  pending.gitignoreRefresh =
    pending.gitignoreRefresh || options.gitignoreRefresh === true;
  for (const filePath of filePaths) {
    pending.filePaths.add(filePath);
  }

  return pending;
}
