import type { GraphViewProvider } from '../../graphViewProvider';
import { shouldIgnoreWorkspaceFileWatcherRefresh } from '../ignore';
import { scheduleWorkspaceRefresh } from './scheduler';
import { normalizeFileWatcherPath } from './recentSaves';

const WORKSPACE_FILE_OPERATION_REFRESH_DELAY_MS = 500;
const WORKSPACE_CREATE_FOLLOW_UP_REFRESH_DELAY_MS = 1_500;

export function refreshWorkspacePaths(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[],
  options: { followUpRefresh?: boolean } = {},
): string[] {
  const refreshPaths = filePaths.filter(filePath =>
    !shouldIgnoreWorkspaceFileWatcherRefresh(filePath),
  );

  if (refreshPaths.length > 0) {
    scheduleWorkspaceRefresh(provider, logMessage, refreshPaths, WORKSPACE_FILE_OPERATION_REFRESH_DELAY_MS, {
      followUpDelayMs: options.followUpRefresh ? WORKSPACE_CREATE_FOLLOW_UP_REFRESH_DELAY_MS : undefined,
      gitignoreRefresh: includesGitignorePath(refreshPaths),
    });
  }

  return refreshPaths;
}

export function isGitignorePath(filePath: string): boolean {
  const normalizedPath = normalizeFileWatcherPath(filePath);
  return normalizedPath.endsWith('/.gitignore') || normalizedPath === '.gitignore';
}

function includesGitignorePath(filePaths: readonly string[]): boolean {
  return filePaths.some(isGitignorePath);
}
