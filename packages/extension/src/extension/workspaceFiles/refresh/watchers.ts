import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  refreshWorkspaceFileOperation,
  refreshWorkspaceRenameOperation,
  refreshWorkspaceSavedDocument,
} from './operations';

export function registerSaveHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider,
): void {
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      refreshWorkspaceSavedDocument(provider, document);
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
      refreshWorkspaceRenameOperation(provider, event.files);
    }),
  );
  context.subscriptions.push(fileWatcher);
}
