import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from '../ignore';
import { scheduleWorkspaceRefresh } from './scheduler';
import {
  emitWorkspaceRenameEvents,
  getRenameFilePaths,
} from './renameEvents';
import {
  isRecentSavedDocumentPath,
  rememberRecentSavedDocumentPath,
} from './recentSaves';
import {
  filterWorkspaceRefreshPaths,
  isGitignorePath,
  refreshWorkspacePaths,
} from './paths';

type WorkspaceRenameFiles = vscode.FileRenameEvent['files'];
type WorkspaceFileEventName = 'workspace:fileCreated' | 'workspace:fileDeleted';

const WORKSPACE_CONTENT_CHANGE_REFRESH_DELAY_MS = 32;

export function refreshWorkspaceSavedDocument(
  provider: GraphViewProvider,
  document: vscode.TextDocument,
): void {
  rememberRecentSavedDocumentPath(document.uri.fsPath);
  refreshWorkspaceChangedPath(
    provider,
    '[CodeGraphy] File saved, refreshing graph',
    document.uri.fsPath,
  );
}

export function refreshWorkspaceChangedFileWatcherPath(
  provider: GraphViewProvider,
  logMessage: string,
  filePath: string,
): void {
  if (isRecentSavedDocumentPath(filePath)) {
    return;
  }

  refreshWorkspaceChangedPath(provider, logMessage, filePath);
}

export function refreshWorkspaceChangedPath(
  provider: GraphViewProvider,
  logMessage: string,
  filePath: string,
): void {
  if (shouldIgnoreWorkspaceFileWatcherRefresh(filePath)) {
    return;
  }

  scheduleWorkspaceRefresh(
    provider,
    logMessage,
    [filePath],
    WORKSPACE_CONTENT_CHANGE_REFRESH_DELAY_MS,
    { gitignoreRefresh: isGitignorePath(filePath) },
  );
  provider.emitEvent('workspace:fileChanged', { filePath });
}

export function refreshWorkspaceFileWatcherOperation(
  provider: GraphViewProvider,
  logMessage: string,
  files: readonly vscode.Uri[],
  eventName: WorkspaceFileEventName,
): void {
  refreshWorkspaceFileOperation(
    provider,
    logMessage,
    files.filter(uri => !isRecentSavedDocumentPath(uri.fsPath)),
    eventName,
  );
}

export function refreshWorkspaceFileOperation(
  provider: GraphViewProvider,
  logMessage: string,
  files: readonly vscode.Uri[],
  eventName: WorkspaceFileEventName,
): void {
  if (eventName === 'workspace:fileCreated') {
    refreshWorkspaceCreatedFiles(provider, logMessage, files);
    return;
  }

  const refreshPaths = refreshWorkspacePaths(
    provider,
    logMessage,
    files.map(uri => uri.fsPath),
  );

  for (const filePath of refreshPaths) {
    provider.emitEvent(eventName, { filePath });
  }
}

function refreshWorkspaceCreatedFiles(
  provider: GraphViewProvider,
  logMessage: string,
  files: readonly vscode.Uri[],
): void {
  const refreshPaths = filterWorkspaceRefreshPaths(files.map(uri => uri.fsPath));
  const refreshPathSet = new Set(refreshPaths);

  for (const filePath of refreshPaths) {
    provider.emitEvent('workspace:fileCreated', { filePath });
  }

  void findCreatedDirectoryPaths(files, refreshPathSet).then((directoryPaths) => {
    refreshWorkspacePaths(provider, logMessage, refreshPaths, {
      followUpFilePaths: directoryPaths,
    });
  });
}

async function findCreatedDirectoryPaths(
  files: readonly vscode.Uri[],
  refreshPaths: ReadonlySet<string>,
): Promise<string[]> {
  const directoryPaths = await Promise.all(files.map(async (uri) => {
    if (!refreshPaths.has(uri.fsPath)) {
      return undefined;
    }

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      return (stat.type & vscode.FileType.Directory) !== 0
        ? uri.fsPath
        : undefined;
    } catch {
      return undefined;
    }
  }));

  return directoryPaths.filter((filePath): filePath is string => filePath !== undefined);
}

export function refreshWorkspaceRenameOperation(
  provider: GraphViewProvider,
  files: WorkspaceRenameFiles,
): void {
  const refreshPaths = refreshWorkspacePaths(
    provider,
    '[CodeGraphy] File renamed, refreshing graph',
    getRenameFilePaths(files),
  );

  if (refreshPaths.length > 0) {
    emitWorkspaceRenameEvents(provider, files);
  }
}
