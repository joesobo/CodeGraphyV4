/**
 * @fileoverview Undoable action for creating files.
 * @module extension/actions/createFile
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../undoManager';
import { resolveWorkspaceCreatePath } from './createPath';

/**
 * Action for creating a file with undo support.
 * Deletes the file on undo (without confirmation).
 */
export class CreateFileAction implements IUndoableAction {
  readonly description: string;
  private _createdParentPaths: string[] = [];

  /**
   * Creates a new CreateFileAction.
   * @param path - File path to create (workspace-relative)
   * @param workspaceFolder - The workspace folder URI
   * @param refreshGraph - Callback to refresh the graph after changes
   */
  constructor(
    private readonly _path: string,
    private readonly _workspaceFolder: vscode.Uri,
    private readonly _refreshGraph: () => Promise<void>
  ) {
    this.description = `Create: ${_path.split('/').pop()}`;
  }

  async execute(): Promise<void> {
    const filePath = resolveWorkspaceCreatePath(this._path, 'file');
    const fileUri = vscode.Uri.joinPath(this._workspaceFolder, filePath);
    const parentPath = filePath.split('/').slice(0, -1).join('/');
    if (parentPath) {
      this._createdParentPaths = await collectMissingParentPaths(
        this._workspaceFolder,
        parentPath
      );
      await vscode.workspace.fs.createDirectory(
        vscode.Uri.joinPath(this._workspaceFolder, parentPath)
      );
    }
    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());

    // Open the new file in editor
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document);

    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const fileUri = vscode.Uri.joinPath(this._workspaceFolder, this._path);

    // Close any editors showing this file
    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document.uri.toString() === fileUri.toString()
    );
    for (const editor of editors) {
      await vscode.window.showTextDocument(editor.document, { preview: true, preserveFocus: false });
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }

    // Delete to trash for safety
    await vscode.workspace.fs.delete(fileUri, { useTrash: true });
    await deleteCreatedParentDirectories(this._workspaceFolder, this._createdParentPaths);
    await this._refreshGraph();
  }
}

async function collectMissingParentPaths(
  workspaceFolder: vscode.Uri,
  parentPath: string
): Promise<string[]> {
  const missingPaths: string[] = [];
  const segments = parentPath.split('/');

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

async function deleteCreatedParentDirectories(
  workspaceFolder: vscode.Uri,
  createdParentPaths: readonly string[]
): Promise<void> {
  for (const parentPath of [...createdParentPaths].reverse()) {
    const parentUri = vscode.Uri.joinPath(workspaceFolder, parentPath);
    const entries = await vscode.workspace.fs.readDirectory(parentUri);
    if (entries.length > 0) {
      break;
    }

    await vscode.workspace.fs.delete(parentUri, { recursive: false, useTrash: true });
  }
}
