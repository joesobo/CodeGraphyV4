import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';
import { hasVisibleWorkspaceFileEditor } from './visibleEditor';

const ACTIVE_EDITOR_CLEAR_DELAY_MS = 150;
const pendingFocusedFileClears = new WeakMap<GraphViewProvider, ReturnType<typeof setTimeout>>();

export function cancelPendingFocusedFileClear(provider: GraphViewProvider): void {
  const pending = pendingFocusedFileClears.get(provider);
  if (!pending) {
    return;
  }

  clearTimeout(pending);
  pendingFocusedFileClears.delete(provider);
}

export function scheduleFocusedFileClear(provider: GraphViewProvider): void {
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
