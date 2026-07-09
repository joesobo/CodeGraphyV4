import type * as vscode from 'vscode';
import { CreateFileAction } from '../../../actions/createFile';
import { DeleteFilesAction } from '../../../actions/deleteFiles';
import { RenameFileAction } from '../../../actions/renameFile';
import { getUndoManager } from '../../../undoManager';
import type { IUndoableAction } from '../../../undoManager';

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

export interface WorkspaceFileMutationContext {
  workspaceFolderUri: vscode.Uri;
  refreshGraph: () => Promise<void>;
}

export async function executeWorkspaceFileMutation(
  mutation: WorkspaceFileMutation,
  context: WorkspaceFileMutationContext,
): Promise<void> {
  let action: IUndoableAction;
  switch (mutation.kind) {
    case 'rename':
      action = new RenameFileAction(
        mutation.oldPath,
        mutation.newPath,
        context.workspaceFolderUri,
        context.refreshGraph,
      );
      break;
    case 'create':
      action = new CreateFileAction(
        mutation.filePath,
        context.workspaceFolderUri,
        context.refreshGraph,
      );
      break;
    case 'delete':
      action = new DeleteFilesAction(
        mutation.paths,
        context.workspaceFolderUri,
        context.refreshGraph,
      );
      break;
  }
  await getUndoManager().execute(action);
}
