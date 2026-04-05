import * as path from 'path';
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
const pendingFocusedFileClears = new WeakMap<GraphViewProvider, ReturnType<typeof setTimeout>>();
const ACTIVE_EDITOR_CLEAR_DELAY_MS = 150;

function hasVisibleWorkspaceFileEditor(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
  visibleTextEditors: readonly vscode.TextEditor[] | undefined,
): boolean {
  const workspaceFolder = workspaceFolders?.[0];
  if (!workspaceFolder) {
    return false;
  }

  return (visibleTextEditors ?? []).some(editor => {
    if (editor.document.uri.scheme !== 'file') {
      return false;
    }

    const relativePath = path.relative(workspaceFolder.uri.fsPath, editor.document.uri.fsPath);
    return !relativePath.startsWith('..');
  });
}

function cancelPendingFocusedFileClear(provider: GraphViewProvider): void {
  const pending = pendingFocusedFileClears.get(provider);
  if (!pending) {
    return;
  }

  clearTimeout(pending);
  pendingFocusedFileClears.delete(provider);
}

function scheduleFocusedFileClear(provider: GraphViewProvider): void {
  cancelPendingFocusedFileClear(provider);

  const timeout = setTimeout(() => {
    pendingFocusedFileClears.delete(provider);

    if (vscode.window.activeTextEditor) {
      return;
    }

    if (hasVisibleWorkspaceFileEditor(vscode.workspace.workspaceFolders, vscode.window.visibleTextEditors)) {
      return;
    }

    provider.setFocusedFile(undefined);
    provider.emitEvent('workspace:activeEditorChanged', { filePath: undefined });
  }, ACTIVE_EDITOR_CLEAR_DELAY_MS);

  pendingFocusedFileClears.set(provider, timeout);
}

function scheduleWorkspaceRefresh(
  provider: GraphViewProvider,
  logMessage: string,
  delayMs: number = 500,
): void {
  const pending = pendingWorkspaceRefreshes.get(provider);
  if (pending) {
    clearTimeout(pending.timeout);
  }

  const nextPending: PendingWorkspaceRefresh = {
    logMessage,
    timeout: setTimeout(() => {
      pendingWorkspaceRefreshes.delete(provider);
      console.log(nextPending.logMessage);
      void provider.refresh();
    }, delayMs),
  };

  pendingWorkspaceRefreshes.set(provider, nextPending);
}

async function syncActiveEditor(
  provider: GraphViewProvider,
  editor: vscode.TextEditor | undefined,
): Promise<void> {
  if (editor && editor.document.uri.scheme === 'file') {
    cancelPendingFocusedFileClear(provider);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const relativePath = path.relative(
        workspaceFolder.uri.fsPath,
        editor.document.uri.fsPath
      );
      if (!relativePath.startsWith('..')) {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        await provider.trackFileVisit(normalizedPath);
        provider.setFocusedFile(normalizedPath);
        provider.emitEvent('workspace:activeEditorChanged', { filePath: normalizedPath });
        return;
      }
    }
  }

  if (!editor) {
    if (hasVisibleWorkspaceFileEditor(vscode.workspace.workspaceFolders, vscode.window.visibleTextEditors)) {
      cancelPendingFocusedFileClear(provider);
      return;
    }

    scheduleFocusedFileClear(provider);
  }
}

/** Registers the active editor change listener that tracks file visits. */
export function registerEditorChangeHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      await syncActiveEditor(provider, editor);
    })
  );
  void syncActiveEditor(provider, vscode.window.activeTextEditor);
}

/** Registers the save listener that debounces graph refresh on file saves. */
export function registerSaveHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (shouldIgnoreSaveForGraphRefresh(document)) {
        return;
      }
      scheduleWorkspaceRefresh(provider, '[CodeGraphy] File saved, refreshing graph');
      provider.emitEvent('workspace:fileChanged', { filePath: document.uri.fsPath });
    })
  );
}

/** Registers file system watchers for file creation and deletion events. */
export function registerFileWatcher(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(
    fileWatcher.onDidCreate((uri) => {
      if (shouldIgnoreWorkspaceFileWatcherRefresh(uri.fsPath)) {
        return;
      }
      scheduleWorkspaceRefresh(provider, '[CodeGraphy] File created, refreshing graph');
      provider.emitEvent('workspace:fileCreated', { filePath: uri.fsPath });
    })
  );
  context.subscriptions.push(
    fileWatcher.onDidDelete((uri) => {
      if (shouldIgnoreWorkspaceFileWatcherRefresh(uri.fsPath)) {
        return;
      }
      scheduleWorkspaceRefresh(provider, '[CodeGraphy] File deleted, refreshing graph');
      provider.emitEvent('workspace:fileDeleted', { filePath: uri.fsPath });
    })
  );
  context.subscriptions.push(fileWatcher);
}
