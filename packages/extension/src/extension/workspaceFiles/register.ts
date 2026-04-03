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

function getWorkspaceRelativeFilePath(
  editor: vscode.TextEditor | undefined,
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): string | undefined {
  if (!editor || editor.document.uri.scheme !== 'file') {
    return undefined;
  }

  const workspaceFolder = workspaceFolders?.[0];
  if (!workspaceFolder) {
    return undefined;
  }

  const relativePath = path.relative(
    workspaceFolder.uri.fsPath,
    editor.document.uri.fsPath
  );
  if (relativePath.startsWith('..')) {
    return undefined;
  }

  return relativePath.replace(/\\/g, '/');
}

function getVisibleWorkspaceRelativeFilePath(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): string | undefined {
  const fallbackEditor = (vscode.window.visibleTextEditors ?? []).find(candidate =>
    getWorkspaceRelativeFilePath(candidate, workspaceFolders) !== undefined
  );

  return getWorkspaceRelativeFilePath(fallbackEditor, workspaceFolders);
}

async function syncProviderToFilePath(
  provider: GraphViewProvider,
  normalizedPath: string,
): Promise<void> {
  await provider.trackFileVisit(normalizedPath);
  provider.setFocusedFile(normalizedPath);
  provider.emitEvent('workspace:activeEditorChanged', { filePath: normalizedPath });
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
  options: {
    allowDeferredVisibleEditorCheck?: boolean;
  } = {},
): Promise<void> {
  const { allowDeferredVisibleEditorCheck = false } = options;
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const normalizedPath = getWorkspaceRelativeFilePath(
    editor,
    workspaceFolders,
  );
  if (normalizedPath) {
    await syncProviderToFilePath(provider, normalizedPath);
    return;
  }

  if (!editor) {
    const fallbackPath = getVisibleWorkspaceRelativeFilePath(workspaceFolders);
    if (fallbackPath) {
      await syncProviderToFilePath(provider, fallbackPath);
      return;
    }

    if (!allowDeferredVisibleEditorCheck) {
      provider.setFocusedFile(undefined);
      provider.emitEvent('workspace:activeEditorChanged', { filePath: undefined });
      return;
    }

    await Promise.resolve();

    const deferredPath =
      getWorkspaceRelativeFilePath(vscode.window.activeTextEditor, workspaceFolders) ??
      getVisibleWorkspaceRelativeFilePath(workspaceFolders);
    if (deferredPath) {
      await syncProviderToFilePath(provider, deferredPath);
      return;
    }
  }

  if (!editor) {
    provider.setFocusedFile(undefined);
    provider.emitEvent('workspace:activeEditorChanged', { filePath: undefined });
  }
}

/** Registers the active editor change listener that tracks file visits. */
export function registerEditorChangeHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      await syncActiveEditor(provider, editor, { allowDeferredVisibleEditorCheck: true });
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
