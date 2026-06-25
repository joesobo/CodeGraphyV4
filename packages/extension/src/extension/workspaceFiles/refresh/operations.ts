import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  shouldIgnoreSaveForGraphRefresh,
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from '../ignore';
import { scheduleWorkspaceRefresh } from './scheduler';
import {
  emitWorkspaceRenameEvents,
  getRenameFilePaths,
} from './renameEvents';
import {
  consumeRecentSavedDocumentPath,
  rememberRecentSavedDocumentPath,
} from './recentSaves';
import {
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
  if (shouldIgnoreSaveForGraphRefresh(document)) {
    return;
  }

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
  if (consumeRecentSavedDocumentPath(filePath)) {
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

export function refreshWorkspaceFileOperation(
  provider: GraphViewProvider,
  logMessage: string,
  files: readonly vscode.Uri[],
  eventName: WorkspaceFileEventName,
): void {
  const refreshPaths = refreshWorkspacePaths(
    provider,
    logMessage,
    files.map(uri => uri.fsPath),
  );

  for (const filePath of refreshPaths) {
    provider.emitEvent(eventName, { filePath });
  }
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
