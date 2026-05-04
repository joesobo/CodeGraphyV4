import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  shouldIgnoreSaveForGraphRefresh,
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from '../ignore';
import { scheduleWorkspaceRefresh } from './scheduler';

function refreshWorkspacePaths(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[],
): string[] {
  const refreshPaths = filePaths.filter(filePath =>
    !shouldIgnoreWorkspaceFileWatcherRefresh(filePath),
  );

  if (refreshPaths.length > 0) {
    scheduleWorkspaceRefresh(provider, logMessage, refreshPaths);
  }

  return refreshPaths;
}

function refreshWorkspaceFileOperation(
  provider: GraphViewProvider,
  logMessage: string,
  files: readonly vscode.Uri[],
  eventName: 'workspace:fileCreated' | 'workspace:fileDeleted',
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

export function registerSaveHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider,
): void {
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (shouldIgnoreSaveForGraphRefresh(document)) {
        return;
      }
      scheduleWorkspaceRefresh(
        provider,
        '[CodeGraphy] File saved, refreshing graph',
        [document.uri.fsPath],
      );
      provider.emitEvent('workspace:fileChanged', { filePath: document.uri.fsPath });
    }),
  );
}

export function registerFileWatcher(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider,
): void {
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(
    fileWatcher.onDidCreate((uri) => {
      refreshWorkspaceFileOperation(
        provider,
        '[CodeGraphy] File created, refreshing graph',
        [uri],
        'workspace:fileCreated',
      );
    }),
  );
  context.subscriptions.push(
    fileWatcher.onDidDelete((uri) => {
      refreshWorkspaceFileOperation(
        provider,
        '[CodeGraphy] File deleted, refreshing graph',
        [uri],
        'workspace:fileDeleted',
      );
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles((event) => {
      refreshWorkspaceFileOperation(
        provider,
        '[CodeGraphy] File created, refreshing graph',
        event.files,
        'workspace:fileCreated',
      );
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles((event) => {
      refreshWorkspaceFileOperation(
        provider,
        '[CodeGraphy] File deleted, refreshing graph',
        event.files,
        'workspace:fileDeleted',
      );
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles((event) => {
      const refreshPaths = refreshWorkspacePaths(
        provider,
        '[CodeGraphy] File renamed, refreshing graph',
        event.files.flatMap(file => [file.oldUri.fsPath, file.newUri.fsPath]),
      );

      if (refreshPaths.length === 0) {
        return;
      }

      for (const file of event.files) {
        provider.emitEvent('workspace:fileRenamed', {
          oldPath: file.oldUri.fsPath,
          newPath: file.newUri.fsPath,
        });
      }
    }),
  );
  context.subscriptions.push(fileWatcher);
}
