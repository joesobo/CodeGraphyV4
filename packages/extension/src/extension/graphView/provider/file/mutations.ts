import * as vscode from 'vscode';
import { CreateFileAction } from '../../../actions/createFile';
import { DeleteFilesAction } from '../../../actions/deleteFiles';
import { RenameFileAction } from '../../../actions/renameFile';
import { getUndoManager } from '../../../undoManager';
import type { IUndoableAction } from '../../../undoManager';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { rememberRecentWorkspaceMutationPaths } from '../../../workspaceFiles/refresh/recentSaves';

export interface RenameWorkspaceFileMutation {
  kind: 'rename';
  oldPath: string;
  newPath: string;
}

export interface CreateWorkspaceFileMutation {
  kind: 'create';
  filePath: string;
}

export interface DeleteWorkspaceFileMutation {
  kind: 'delete';
  paths: string[];
}

export type WorkspaceFileMutation =
  | RenameWorkspaceFileMutation
  | CreateWorkspaceFileMutation
  | DeleteWorkspaceFileMutation;

export function workspaceFileMutationPaths(
  mutation: WorkspaceFileMutation,
): string[] {
  switch (mutation.kind) {
    case 'rename': return [mutation.oldPath, mutation.newPath];
    case 'create': return [mutation.filePath];
    case 'delete': return [...mutation.paths];
  }
}

export interface WorkspaceFileMutationContext {
  workspaceFolderUri: vscode.Uri;
  refreshGraph: () => Promise<void>;
  sendMessage?: (message: ExtensionToWebviewMessage) => void;
}

let mutationOrdinal = 0;

export async function executeWorkspaceFileMutation(
  mutation: WorkspaceFileMutation,
  context: WorkspaceFileMutationContext,
): Promise<void> {
  const affectedPaths = workspaceFileMutationPaths(mutation);
  const affectedFileSystemPaths = affectedPaths.map(filePath =>
    vscode.Uri.joinPath(context.workspaceFolderUri, filePath).fsPath
  );
  const refreshGraph = async (): Promise<void> => {
    rememberRecentWorkspaceMutationPaths(affectedFileSystemPaths);
    await context.refreshGraph();
  };
  rememberRecentWorkspaceMutationPaths(affectedFileSystemPaths);
  const mutationId = context.sendMessage
    ? `file-mutation-${++mutationOrdinal}`
    : undefined;
  if (mutationId) {
    context.sendMessage?.({
      type: 'FILE_MUTATION_STARTED',
      payload: { mutationId, mutation },
    });
  }
  let action: IUndoableAction;
  switch (mutation.kind) {
    case 'rename':
      action = new RenameFileAction(
        mutation.oldPath,
        mutation.newPath,
        context.workspaceFolderUri,
        refreshGraph,
      );
      break;
    case 'create':
      action = new CreateFileAction(
        mutation.filePath,
        context.workspaceFolderUri,
        refreshGraph,
      );
      break;
    case 'delete':
      action = new DeleteFilesAction(
        mutation.paths,
        context.workspaceFolderUri,
        refreshGraph,
      );
      break;
  }
  try {
    await getUndoManager().execute(action);
  } catch (error) {
    if (mutationId) {
      context.sendMessage?.({
        type: 'FILE_MUTATION_FAILED',
        payload: {
          mutationId,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
    throw error;
  }
}
