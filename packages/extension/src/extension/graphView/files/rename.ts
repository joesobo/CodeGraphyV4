import * as vscode from 'vscode';

interface GraphViewWorkspaceFolderRef {
  uri: vscode.Uri;
}

export interface GraphViewFileRenameHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  showInputBox(options: vscode.InputBoxOptions): PromiseLike<string | undefined>;
  executeRenameAction(
    oldPath: string,
    newPath: string,
    workspaceFolderUri: vscode.Uri,
  ): PromiseLike<void>;
  showErrorMessage(message: string): void;
}

export async function renameGraphViewFile(
  filePath: string,
  handlers: GraphViewFileRenameHandlers,
): Promise<void> {
  if (!handlers.workspaceFolder) return;

  const oldName = filePath.split('/').pop() || filePath;
  const extensionIndex = oldName.lastIndexOf('.');
  const selectionEnd = extensionIndex > 0 ? extensionIndex : oldName.length;
  const newName = await handlers.showInputBox({
    prompt: 'Enter new file name',
    value: oldName,
    valueSelection: [0, selectionEnd],
    ignoreFocusOut: true,
  });

  if (!newName || newName === oldName) return;

  const newPath = filePath.replace(/[^/]+$/, newName);

  try {
    await handlers.executeRenameAction(filePath, newPath, handlers.workspaceFolder.uri);
  } catch (error) {
    handlers.showErrorMessage(`Failed to rename: ${toErrorMessage(error)}`);
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
