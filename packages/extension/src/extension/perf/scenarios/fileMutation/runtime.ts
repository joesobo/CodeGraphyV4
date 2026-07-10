import * as vscode from 'vscode';
import {
  executeWorkspaceFileMutation,
  type WorkspaceFileMutation,
  type WorkspaceFileMutationContext,
} from '../../../graphView/provider/file/mutations';
import { getUndoManager } from '../../../undoManager';
import type { GraphViewProvider } from '../../../graphViewProvider';
import {
  armWorkspaceRefreshIdleWait,
  waitForWorkspaceRefreshIdle,
  type ArmedWorkspaceRefreshIdleWait,
} from '../../../workspaceFiles/refresh/scheduler';
import type { ReadWorkspaceFile } from './snapshot';

export interface FileMutationScenarioDependencies {
  executeMutation: (
    mutation: WorkspaceFileMutation,
    context: WorkspaceFileMutationContext,
  ) => Promise<void>;
  focusWorkspaceEditor: () => Promise<void>;
  readFile: ReadWorkspaceFile;
  undoLastMutation: () => Promise<string | undefined>;
}

export async function focusFileMutationWorkspaceEditor(): Promise<void> {
  const workspaceEditor = vscode.window.visibleTextEditors.find(
    editor => editor.viewColumn === vscode.ViewColumn.One,
  );
  if (!workspaceEditor) {
    throw new Error(
      'Performance file mutation requires a visible workspace editor in column one',
    );
  }
  await vscode.window.showTextDocument(workspaceEditor.document, {
    preserveFocus: false,
    preview: false,
    viewColumn: vscode.ViewColumn.One,
  });
}

export const fileMutationScenarioRuntime: FileMutationScenarioDependencies = {
  executeMutation: (mutation, context) => executeWorkspaceFileMutation(mutation, context),
  focusWorkspaceEditor: focusFileMutationWorkspaceEditor,
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

export function createFileMutationRefreshIdleArm(
  provider: GraphViewProvider,
): () => ArmedWorkspaceRefreshIdleWait {
  return () => armWorkspaceRefreshIdleWait(
    provider,
    { quietMs: 32, timeoutMs: 30_000 },
  );
}
