import * as vscode from 'vscode';
import { IUndoableAction } from '../undoManager';

export class CreateFolderAction implements IUndoableAction {
  readonly description: string;
  private _createdParentPaths: string[] = [];

  constructor(
    private readonly _path: string,
    private readonly _workspaceFolder: vscode.Uri,
    private readonly _refreshGraph: () => Promise<void>,
  ) {
    this.description = `Create folder: ${_path.split('/').pop()}`;
  }

  async execute(): Promise<void> {
    const folderUri = vscode.Uri.joinPath(this._workspaceFolder, this._path);
    this._createdParentPaths = await collectMissingFolderPaths(
      this._workspaceFolder,
      this._path,
    );
    await vscode.workspace.fs.createDirectory(folderUri);
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const deleted = await deleteCreatedFolders(
      this._workspaceFolder,
      this._createdParentPaths.length > 0 ? this._createdParentPaths : [this._path],
    );
    if (deleted) {
      await this._refreshGraph();
    }
  }
}

async function collectMissingFolderPaths(
  workspaceFolder: vscode.Uri,
  folderPath: string,
): Promise<string[]> {
  const missingPaths: string[] = [];
  const segments = folderPath.split('/');

  for (let index = 0; index < segments.length; index += 1) {
    const path = segments.slice(0, index + 1).join('/');
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(workspaceFolder, path));
    } catch {
      missingPaths.push(path);
    }
  }

  return missingPaths;
}

async function deleteCreatedFolders(
  workspaceFolder: vscode.Uri,
  createdFolderPaths: readonly string[],
): Promise<boolean> {
  let deleted = false;
  for (const folderPath of [...createdFolderPaths].reverse()) {
    const folderUri = vscode.Uri.joinPath(workspaceFolder, folderPath);
    const entries = await vscode.workspace.fs.readDirectory(folderUri);
    if (entries.length > 0) {
      break;
    }

    await vscode.workspace.fs.delete(folderUri, { recursive: false, useTrash: true });
    deleted = true;
  }

  return deleted;
}
