import * as vscode from 'vscode';

interface GraphViewWorkspaceFolderRef {
  uri: vscode.Uri;
}

export interface GraphViewFileDeleteHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  showWarningMessage(
    message: string,
    options: { modal: true },
    deleteAction: 'Delete',
  ): PromiseLike<'Delete' | undefined>;
  executeDeleteAction(paths: string[], workspaceFolderUri: vscode.Uri): PromiseLike<void>;
}

export interface GraphViewFileCreateHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  showInputBox(options: vscode.InputBoxOptions): PromiseLike<string | undefined>;
  executeCreateAction(filePath: string, workspaceFolderUri: vscode.Uri): PromiseLike<void>;
  showErrorMessage(message: string): void;
}

export interface GraphViewExcludeHandlers {
  executeAddToExcludeAction(patterns: string[]): PromiseLike<void>;
}

export async function deleteGraphViewFiles(
  paths: string[],
  handlers: GraphViewFileDeleteHandlers,
): Promise<void> {
  if (!handlers.workspaceFolder) return;

  const count = paths.length;
  const message =
    count === 1
      ? `Are you sure you want to delete "${paths[0]}"?`
      : `Are you sure you want to delete ${count} files?`;

  const confirm = await handlers.showWarningMessage(message, { modal: true }, 'Delete');
  if (confirm === 'Delete') {
    await handlers.executeDeleteAction(paths, handlers.workspaceFolder.uri);
  }
}

export async function createGraphViewFile(
  directory: string,
  handlers: GraphViewFileCreateHandlers,
): Promise<void> {
  if (!handlers.workspaceFolder) return;

  const fileName = await handlers.showInputBox({
    prompt: 'Enter file name',
    placeHolder: 'newfile.ts',
    ignoreFocusOut: true,
  });
  if (!fileName) return;

  const filePath = directory === '.' ? fileName : `${directory}/${fileName}`;

  try {
    await handlers.executeCreateAction(filePath, handlers.workspaceFolder.uri);
  } catch (error) {
    handlers.showErrorMessage(`Failed to create file: ${toErrorMessage(error)}`);
  }
}

export async function addGraphViewExcludePatterns(
  patterns: string[],
  handlers: GraphViewExcludeHandlers,
): Promise<void> {
  await handlers.executeAddToExcludeAction(patterns);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
