import * as path from 'path';
import * as vscode from 'vscode';
import type { GraphViewProvider } from './graphViewProvider';
import { shouldIgnoreSaveForGraphRefresh } from './fileEventHandlers';

/** Registers the active editor change listener that tracks file visits. */
export function registerEditorChangeHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.uri.scheme === 'file') {
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
          }
        }
      } else {
        provider.setFocusedFile(undefined);
        provider.emitEvent('workspace:activeEditorChanged', { filePath: undefined });
      }
    })
  );
}

/** Registers the save listener that debounces graph refresh on file saves. */
export function registerSaveHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (shouldIgnoreSaveForGraphRefresh(document)) {
        return;
      }
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        console.log('[CodeGraphy] File saved, refreshing graph');
        void provider.refresh();
        provider.emitEvent('workspace:fileChanged', { filePath: document.uri.fsPath });
      }, 500);
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
      console.log('[CodeGraphy] File created, refreshing graph');
      void provider.refresh();
      provider.emitEvent('workspace:fileCreated', { filePath: uri.fsPath });
    })
  );
  context.subscriptions.push(
    fileWatcher.onDidDelete((uri) => {
      console.log('[CodeGraphy] File deleted, refreshing graph');
      void provider.refresh();
      provider.emitEvent('workspace:fileDeleted', { filePath: uri.fsPath });
    })
  );
  context.subscriptions.push(fileWatcher);
}
