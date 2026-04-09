import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';
import {
  shouldIgnoreSaveForGraphRefresh,
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from './ignore';

interface PendingWorkspaceRefresh {
  logMessage: string;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingWorkspaceRefreshes = new WeakMap<GraphViewProvider, PendingWorkspaceRefresh>();

function isGraphOpen(provider: GraphViewProvider): boolean {
  return provider.isGraphOpen?.() ?? true;
}

function markWorkspaceRefreshPending(
  provider: GraphViewProvider,
  logMessage: string,
): void {
  provider.markWorkspaceRefreshPending?.(logMessage);
}

export function scheduleWorkspaceRefresh(
  provider: GraphViewProvider,
  logMessage: string,
  delayMs: number = 500,
): void {
  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(provider, logMessage);
    return;
  }

  const pending = pendingWorkspaceRefreshes.get(provider);
  if (pending) {
    clearTimeout(pending.timeout);
  }

  const nextPending: PendingWorkspaceRefresh = {
    logMessage,
    timeout: setTimeout(() => {
      pendingWorkspaceRefreshes.delete(provider);
      if (!isGraphOpen(provider)) {
        markWorkspaceRefreshPending(provider, nextPending.logMessage);
        return;
      }
      console.log(nextPending.logMessage);
      void provider.refresh();
    }, delayMs),
  };

  pendingWorkspaceRefreshes.set(provider, nextPending);
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
      scheduleWorkspaceRefresh(provider, '[CodeGraphy] File saved, refreshing graph');
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
      scheduleWorkspaceRefresh(provider, '[CodeGraphy] File created, refreshing graph');
      provider.emitEvent('workspace:fileCreated', { filePath: uri.fsPath });
    }),
  );
  context.subscriptions.push(
    fileWatcher.onDidDelete((uri) => {
      if (shouldIgnoreWorkspaceFileWatcherRefresh(uri.fsPath)) {
        return;
      }
      scheduleWorkspaceRefresh(provider, '[CodeGraphy] File deleted, refreshing graph');
      provider.emitEvent('workspace:fileDeleted', { filePath: uri.fsPath });
    }),
  );
  context.subscriptions.push(fileWatcher);
}
