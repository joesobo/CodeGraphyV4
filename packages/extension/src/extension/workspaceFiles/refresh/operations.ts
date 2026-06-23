import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  shouldIgnoreSaveForGraphRefresh,
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from '../ignore';
import { scheduleWorkspaceRefresh } from './scheduler';

type WorkspaceRenameFiles = vscode.FileRenameEvent['files'];
type WorkspaceFileEventName = 'workspace:fileCreated' | 'workspace:fileDeleted';

const WORKSPACE_CONTENT_CHANGE_REFRESH_DELAY_MS = 50;
const WORKSPACE_FILE_OPERATION_REFRESH_DELAY_MS = 500;

function isGitignorePath(filePath: string): boolean {
  return filePath.replace(/\\/g, '/').endsWith('/.gitignore')
    || filePath.replace(/\\/g, '/') === '.gitignore';
}

function includesGitignorePath(filePaths: readonly string[]): boolean {
  return filePaths.some(isGitignorePath);
}

function refreshWorkspacePaths(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[],
): string[] {
  const refreshPaths = filePaths.filter(filePath =>
    !shouldIgnoreWorkspaceFileWatcherRefresh(filePath),
  );

  if (refreshPaths.length > 0) {
    scheduleWorkspaceRefresh(provider, logMessage, refreshPaths, WORKSPACE_FILE_OPERATION_REFRESH_DELAY_MS, {
      gitignoreRefresh: includesGitignorePath(refreshPaths),
    });
  }

  return refreshPaths;
}

export function refreshWorkspaceSavedDocument(
  provider: GraphViewProvider,
  document: vscode.TextDocument,
): void {
  if (shouldIgnoreSaveForGraphRefresh(document)) {
    return;
  }

  refreshWorkspaceChangedPath(
    provider,
    '[CodeGraphy] File saved, refreshing graph',
    document.uri.fsPath,
  );
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

function getRenameFilePaths(files: WorkspaceRenameFiles): string[] {
  return files.flatMap(file => [file.oldUri.fsPath, file.newUri.fsPath]);
}

function emitWorkspaceRenameEvents(
  provider: GraphViewProvider,
  files: WorkspaceRenameFiles,
): void {
  for (const file of files) {
    provider.emitEvent('workspace:fileRenamed', {
      oldPath: file.oldUri.fsPath,
      newPath: file.newUri.fsPath,
    });
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
