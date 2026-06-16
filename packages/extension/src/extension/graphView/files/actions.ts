import * as vscode from 'vscode';
import { isSafeGraphViewChildPath } from './validation';

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

export interface GraphViewFolderCreateHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  showInputBox(options: vscode.InputBoxOptions): PromiseLike<string | undefined>;
  executeCreateFolderAction(folderPath: string, workspaceFolderUri: vscode.Uri): PromiseLike<void>;
  showErrorMessage(message: string): void;
}

export interface GraphViewExcludeHandlers {
  executeAddToExcludeAction(patterns: string[]): PromiseLike<void>;
}

export async function deleteGraphViewFiles(
  paths: string[],
  handlers: GraphViewFileDeleteHandlers,
): Promise<void> {
  const count = paths.length;
  const message =
    count === 1
      ? `Are you sure you want to delete "${paths[0]}"?`
      : `Are you sure you want to delete ${count} files?`;

  const confirm = await handlers.showWarningMessage(message, { modal: true }, 'Delete');
  if (!handlers.workspaceFolder) return;

  if (confirm === 'Delete') {
    await handlers.executeDeleteAction(paths, handlers.workspaceFolder.uri);
  }
}

export async function createGraphViewFile(
  directory: string,
  handlers: GraphViewFileCreateHandlers,
): Promise<string | void> {
  if (!handlers.workspaceFolder) return undefined;

  const fileName = await handlers.showInputBox({
    prompt: 'Enter file name',
    placeHolder: 'newfile.ts',
    ignoreFocusOut: true,
  });
  if (fileName === undefined) return undefined;
  if (!isSafeGraphViewChildPath(fileName)) {
    handlers.showErrorMessage('Enter a relative file path inside this folder.');
    return undefined;
  }

  const filePath = directory === '.' ? fileName : `${directory}/${fileName}`;

  try {
    await handlers.executeCreateAction(filePath, handlers.workspaceFolder.uri);
    return filePath;
  } catch (error) {
    handlers.showErrorMessage(`Failed to create file: ${toErrorMessage(error)}`);
    return undefined;
  }
}

export async function createGraphViewFolder(
  directory: string,
  handlers: GraphViewFolderCreateHandlers,
): Promise<string | void> {
  if (!handlers.workspaceFolder) return undefined;

  const folderName = await handlers.showInputBox({
    prompt: 'Enter folder name',
    placeHolder: 'new-folder',
    ignoreFocusOut: true,
  });
  if (folderName === undefined) return undefined;
  if (!isSafeGraphViewChildPath(folderName)) {
    handlers.showErrorMessage('Enter a relative folder path inside this folder.');
    return undefined;
  }

  const folderPath = directory === '.' ? folderName : `${directory}/${folderName}`;

  try {
    await handlers.executeCreateFolderAction(folderPath, handlers.workspaceFolder.uri);
    return folderPath;
  } catch (error) {
    handlers.showErrorMessage(`Failed to create folder: ${toErrorMessage(error)}`);
    return undefined;
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
