import * as vscode from 'vscode';
import { isSafeGraphViewChildPath } from './validation';
import {
  existingItemNameMessage,
  invalidItemNameMessage,
  isExistingItemError,
  leadingSlashItemNameMessage,
  missingItemNameMessage,
  whitespaceItemNameMessage,
} from '../../../shared/files/messages';

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
    deleteAction: GraphViewDeleteAction,
    doNotAskAction: 'Do not ask me again',
  ): PromiseLike<GraphViewDeleteAction | 'Do not ask me again' | undefined>;
  executeDeleteAction(
    paths: string[],
    workspaceFolderUri: vscode.Uri,
    useTrash: boolean,
  ): PromiseLike<void>;
  useTrash: boolean;
  targetKinds?: Array<'file' | 'directory'>;
  deleteAction?: GraphViewDeleteAction;
  trashName?: 'Recycle Bin' | 'Trash';
}

export type GraphViewDeleteAction = 'Delete Permanently' | 'Move to Recycle Bin' | 'Move to Trash';

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
  const message = createDeleteConfirmationMessage(
    paths,
    handlers.targetKinds ?? paths.map(() => 'file'),
    handlers.useTrash,
  );

  const trashName = handlers.trashName ?? 'Trash';
  const detail = handlers.useTrash
    ? count === 1
      ? `You can restore this file from the ${trashName}.`
      : `You can restore these files from the ${trashName}.`
    : 'This action is irreversible!';
  const deleteAction: GraphViewDeleteAction = handlers.deleteAction
    ?? (handlers.useTrash ? 'Move to Trash' : 'Delete Permanently');
  const confirmation = handlers.confirmDelete
    ? await handlers.showWarningMessage(
      message,
      { detail, modal: true },
      deleteAction,
      'Do not ask me again',
    )
    : deleteAction;
  if (!handlers.workspaceFolder) return;

  if (confirmation === 'Do not ask me again') {
    await handlers.disableDeleteConfirmation();
  }
  if (confirmation === deleteAction || confirmation === 'Do not ask me again') {
    await handlers.executeDeleteAction(paths, handlers.workspaceFolder.uri, handlers.useTrash);
  }
}

export function createDeleteConfirmationMessage(
  paths: readonly string[],
  kinds: ReadonlyArray<'file' | 'directory'>,
  useTrash: boolean,
): string {
  const permanent = useTrash ? '' : 'permanently ';
  if (paths.length === 1) {
    const contents = kinds[0] === 'directory' ? ' and its contents' : '';
    return `Are you sure you want to ${permanent}delete '${paths[0]}'${contents}?`;
  }

  const directoryCount = kinds.filter(kind => kind === 'directory').length;
  const targets = directoryCount === 0
    ? 'files'
    : directoryCount === paths.length
      ? 'directories and their contents'
      : 'files/directories and their contents';
  return `Are you sure you want to ${permanent}delete the following ${paths.length} ${targets}?`;
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
  return createNamedGraphViewFile(directory, fileName, handlers);
}

export async function createNamedGraphViewFile(
  directory: string,
  fileName: string,
  handlers: GraphViewFileCreateHandlers,
): Promise<string | void> {
  if (!handlers.workspaceFolder) return undefined;
  const inputError = validateCreateInput(fileName);
  if (inputError) {
    handlers.showErrorMessage(inputError);
    return undefined;
  }
  const normalizedFileName = fileName;
  if (!isSafeGraphViewChildPath(normalizedFileName)) {
    handlers.showErrorMessage(invalidItemNameMessage(normalizedFileName));
    return undefined;
  }

  const filePath = directory === '.' ? normalizedFileName : `${directory}/${normalizedFileName}`;

  try {
    await handlers.executeCreateAction(filePath, handlers.workspaceFolder.uri);
    return filePath;
  } catch (error) {
    handlers.showErrorMessage(isExistingItemError(error)
      ? existingItemNameMessage(normalizedFileName.split('/').pop() ?? normalizedFileName)
      : `Failed to create file: ${toErrorMessage(error)}`);
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
  return createNamedGraphViewFolder(directory, folderName, handlers);
}

export async function createNamedGraphViewFolder(
  directory: string,
  folderName: string,
  handlers: GraphViewFolderCreateHandlers,
): Promise<string | void> {
  if (!handlers.workspaceFolder) return undefined;
  const inputError = validateCreateInput(folderName);
  if (inputError) {
    handlers.showErrorMessage(inputError);
    return undefined;
  }
  const normalizedFolderName = folderName;
  if (!isSafeGraphViewChildPath(normalizedFolderName)) {
    handlers.showErrorMessage(invalidItemNameMessage(normalizedFolderName));
    return undefined;
  }

  const folderPath = directory === '.' ? normalizedFolderName : `${directory}/${normalizedFolderName}`;

  try {
    await handlers.executeCreateFolderAction(folderPath, handlers.workspaceFolder.uri);
    return folderPath;
  } catch (error) {
    handlers.showErrorMessage(isExistingItemError(error)
      ? existingItemNameMessage(normalizedFolderName.split('/').pop() ?? normalizedFolderName)
      : `Failed to create folder: ${toErrorMessage(error)}`);
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

function validateCreateInput(value: string): string | null {
  if (!value.trim()) return missingItemNameMessage;
  if (value.startsWith('/')) return leadingSlashItemNameMessage;
  if (value !== value.trim()) return whitespaceItemNameMessage;
  return null;
}
