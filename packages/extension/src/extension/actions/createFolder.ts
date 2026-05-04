import * as vscode from 'vscode';
import { IUndoableAction } from '../undoManager';

export class CreateFolderAction implements IUndoableAction {
  readonly description: string;

  constructor(
    private readonly _path: string,
    private readonly _workspaceFolder: vscode.Uri,
    private readonly _refreshGraph: () => Promise<void>,
  ) {
    this.description = `Create folder: ${_path.split('/').pop()}`;
  }

  async execute(): Promise<void> {
    const folderUri = vscode.Uri.joinPath(this._workspaceFolder, this._path);
    await vscode.workspace.fs.createDirectory(folderUri);
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const folderUri = vscode.Uri.joinPath(this._workspaceFolder, this._path);
    const entries = await vscode.workspace.fs.readDirectory(folderUri);
    if (entries.length > 0) {
      return;
    }

    await vscode.workspace.fs.delete(folderUri, { recursive: false, useTrash: true });
    await this._refreshGraph();
  }
}
