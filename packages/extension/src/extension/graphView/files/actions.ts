import * as vscode from 'vscode';
import { isSafeGraphViewChildPath } from './validation';

interface GraphViewWorkspaceFolderRef {
  uri: vscode.Uri;
}

export interface GraphViewFileDeleteHandlers {
  confirmDelete: boolean;
  disableDeleteConfirmation(): PromiseLike<void>;
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  showWarningMessage(
    message: string,
    options: { detail: string; modal: true },
    deleteAction: 'Delete',
    doNotAskAction: 'Do not ask me again',
  ): PromiseLike<'Delete' | 'Do not ask me again' | undefined>;
  executeDeleteAction(
    paths: string[],
    workspaceFolderUri: vscode.Uri,
    useTrash: boolean,
  ): PromiseLike<void>;
  useTrash: boolean;
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

  const detail = handlers.useTrash
    ? count === 1
      ? 'You can restore this file from the Trash.'
      : 'You can restore these files from the Trash.'
    : 'This action is irreversible!';
  const confirmation = handlers.confirmDelete
    ? await handlers.showWarningMessage(
      message,
      { detail, modal: true },
      'Delete',
      'Do not ask me again',
    )
    : 'Delete';
  if (!handlers.workspaceFolder) return;

  if (confirmation === 'Do not ask me again') {
    await handlers.disableDeleteConfirmation();
  }
  if (confirmation === 'Delete' || confirmation === 'Do not ask me again') {
    await handlers.executeDeleteAction(paths, handlers.workspaceFolder.uri, handlers.useTrash);
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
  const normalizedFileName = fileName.trim();
  if (!isSafeGraphViewChildPath(normalizedFileName)) {
    handlers.showErrorMessage('Enter a relative file path inside this folder.');
    return undefined;
  }

  const filePath = directory === '.' ? normalizedFileName : `${directory}/${normalizedFileName}`;

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
  const normalizedFolderName = folderName.trim();
  if (!isSafeGraphViewChildPath(normalizedFolderName)) {
    handlers.showErrorMessage('Enter a relative folder path inside this folder.');
    return undefined;
  }

  const folderPath = directory === '.' ? normalizedFolderName : `${directory}/${normalizedFolderName}`;

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
