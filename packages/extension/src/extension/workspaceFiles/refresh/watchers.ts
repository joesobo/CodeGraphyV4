import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  refreshWorkspaceChangedFileWatcherPath,
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
  const gitignoreWatcher = vscode.workspace.createFileSystemWatcher('**/.gitignore');
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
    fileWatcher.onDidChange((uri) => {
      refreshWorkspaceChangedFileWatcherPath(
        provider,
        '[CodeGraphy] File changed, refreshing graph',
        uri.fsPath,
      );
    }),
  );
  context.subscriptions.push(
    gitignoreWatcher.onDidCreate((uri) => {
      refreshWorkspaceFileOperation(
        provider,
        '[CodeGraphy] .gitignore created, refreshing graph',
        [uri],
        'workspace:fileCreated',
      );
    }),
  );
  context.subscriptions.push(
    gitignoreWatcher.onDidDelete((uri) => {
      refreshWorkspaceFileOperation(
        provider,
        '[CodeGraphy] .gitignore deleted, refreshing graph',
        [uri],
        'workspace:fileDeleted',
      );
    }),
  );
  context.subscriptions.push(
    gitignoreWatcher.onDidChange((uri) => {
      refreshWorkspaceChangedFileWatcherPath(
        provider,
        '[CodeGraphy] .gitignore changed, refreshing graph',
        uri.fsPath,
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
  context.subscriptions.push(gitignoreWatcher);
}
