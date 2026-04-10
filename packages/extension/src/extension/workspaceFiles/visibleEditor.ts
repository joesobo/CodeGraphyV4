import * as path from 'path';
import * as vscode from 'vscode';

export function hasVisibleWorkspaceFileEditor(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
  visibleTextEditors: readonly vscode.TextEditor[] | undefined,
): boolean {
  const workspaceFolder = workspaceFolders?.[0];
  if (!workspaceFolder) {
    return false;
  }

  return (visibleTextEditors ?? []).some((editor) => {
    if (editor.document.uri.scheme !== 'file') {
      return false;
    }

    const relativePath = path.relative(workspaceFolder.uri.fsPath, editor.document.uri.fsPath);
    return !relativePath.startsWith('..');
  });
}
