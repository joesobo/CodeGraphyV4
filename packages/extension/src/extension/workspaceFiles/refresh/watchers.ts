import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  shouldIgnoreSaveForGraphRefresh,
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from '../ignore';
import { scheduleWorkspaceRefresh } from './scheduler';

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
      if (shouldIgnoreWorkspaceFileWatcherRefresh(uri.fsPath)) {
        return;
      }
      scheduleWorkspaceRefresh(
        provider,
        '[CodeGraphy] File created, refreshing graph',
        [uri.fsPath],
      );
      provider.emitEvent('workspace:fileCreated', { filePath: uri.fsPath });
    }),
  );
  context.subscriptions.push(
    fileWatcher.onDidDelete((uri) => {
      if (shouldIgnoreWorkspaceFileWatcherRefresh(uri.fsPath)) {
        return;
      }
      scheduleWorkspaceRefresh(
        provider,
        '[CodeGraphy] File deleted, refreshing graph',
        [uri.fsPath],
      );
      provider.emitEvent('workspace:fileDeleted', { filePath: uri.fsPath });
    }),
  );
  context.subscriptions.push(fileWatcher);
}
