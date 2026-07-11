import * as vscode from 'vscode';
import {
  createGraphViewRenameInput,
  planGraphViewRename,
} from './rename/model';

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

  const input = createGraphViewRenameInput(filePath);
  const newName = await handlers.showInputBox({
    prompt: 'Enter new file name',
    value: input.value,
    valueSelection: input.selection,
    ignoreFocusOut: true,
  });

  if (newName === undefined) return;
  await renameGraphViewFileTo(filePath, newName, handlers);
}

export async function renameGraphViewFileTo(
  filePath: string,
  newName: string,
  handlers: GraphViewFileRenameHandlers,
): Promise<void> {
  if (!handlers.workspaceFolder) return;
  const plan = planGraphViewRename(filePath, newName);
  if (plan.kind === 'unchanged') return;
  if (plan.kind === 'invalid') {
    handlers.showErrorMessage(plan.message);
    return;
  }

  try {
    await handlers.executeRenameAction(filePath, plan.newPath, handlers.workspaceFolder.uri);
  } catch (error) {
    handlers.showErrorMessage(`Failed to rename: ${toErrorMessage(error)}`);
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
