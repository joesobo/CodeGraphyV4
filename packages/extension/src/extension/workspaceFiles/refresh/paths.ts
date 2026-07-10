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
  options: { followUpFilePaths?: readonly string[] } = {},
): string[] {
  const refreshPaths = filterWorkspaceRefreshPaths(filePaths);
  const refreshPathSet = new Set(refreshPaths);
  const followUpFilePaths = filterWorkspaceRefreshPaths(
    options.followUpFilePaths ?? [],
  ).filter(filePath => refreshPathSet.has(filePath));

  if (refreshPaths.length > 0) {
    scheduleWorkspaceRefresh(provider, logMessage, refreshPaths, WORKSPACE_FILE_OPERATION_REFRESH_DELAY_MS, {
      followUpDelayMs: followUpFilePaths.length > 0
        ? WORKSPACE_CREATE_FOLLOW_UP_REFRESH_DELAY_MS
        : undefined,
      followUpFilePaths,
      gitignoreRefresh: includesGitignorePath(refreshPaths),
    });
  }

  return refreshPaths;
}

export function filterWorkspaceRefreshPaths(filePaths: readonly string[]): string[] {
  return filePaths.filter(filePath =>
    !shouldIgnoreWorkspaceFileWatcherRefresh(filePath),
  );
}

export function isGitignorePath(filePath: string): boolean {
  const normalizedPath = normalizeFileWatcherPath(filePath);
  return normalizedPath.endsWith('/.gitignore') || normalizedPath === '.gitignore';
}

function includesGitignorePath(filePaths: readonly string[]): boolean {
  return filePaths.some(isGitignorePath);
}
