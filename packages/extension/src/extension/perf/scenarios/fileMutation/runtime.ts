import * as vscode from 'vscode';
import {
  executeWorkspaceFileMutation,
  type WorkspaceFileMutation,
  type WorkspaceFileMutationContext,
} from '../../../graphView/provider/file/mutations';
import { getUndoManager } from '../../../undoManager';
import type { GraphViewProvider } from '../../../graphViewProvider';
import { waitForWorkspaceRefreshIdle } from '../../../workspaceFiles/refresh/scheduler';
import type { ReadWorkspaceFile } from './snapshot';

export interface FileMutationScenarioDependencies {
  executeMutation: (
    mutation: WorkspaceFileMutation,
    context: WorkspaceFileMutationContext,
  ) => Promise<void>;
  readFile: ReadWorkspaceFile;
  undoLastMutation: () => Promise<string | undefined>;
}

export const fileMutationScenarioRuntime: FileMutationScenarioDependencies = {
  executeMutation: (mutation, context) => executeWorkspaceFileMutation(mutation, context),
  readFile: async (workspaceFolderUri, path) => {
    const uri = vscode.Uri.joinPath(workspaceFolderUri, path);
    try {
      await vscode.workspace.fs.stat(uri);
    } catch {
      return undefined;
    }
    return vscode.workspace.fs.readFile(uri);
  },
  undoLastMutation: () => getUndoManager().undo(),
};

export function createFileMutationRefreshIdleWaiter(
  provider: GraphViewProvider,
): () => Promise<void> {
  return () => waitForWorkspaceRefreshIdle(provider, { quietMs: 32 });
}
