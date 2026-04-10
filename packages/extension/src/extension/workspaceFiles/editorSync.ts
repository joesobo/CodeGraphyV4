import * as path from 'path';
import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';
import { cancelPendingFocusedFileClear, scheduleFocusedFileClear } from './focusedFileClear';
import { hasVisibleWorkspaceFileEditor } from './visibleEditor';

export async function syncActiveEditor(
  provider: GraphViewProvider,
  editor: vscode.TextEditor | undefined,
): Promise<void> {
  if (editor && editor.document.uri.scheme === 'file') {
    cancelPendingFocusedFileClear(provider);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const relativePath = path.relative(
        workspaceFolder.uri.fsPath,
        editor.document.uri.fsPath,
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

export function registerEditorChangeHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider,
): void {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      await syncActiveEditor(provider, editor);
    }),
  );
  void syncActiveEditor(provider, vscode.window.activeTextEditor);
}
