/**
 * @fileoverview Undoable action for creating files.
 * @module extension/actions/CreateFileAction
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../UndoManager';

/**
 * Action for creating a file with undo support.
 * Deletes the file on undo (without confirmation).
 */
export class CreateFileAction implements IUndoableAction {
  readonly description: string;

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
    const fileUri = vscode.Uri.joinPath(this._workspaceFolder, this._path);
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
    await this._refreshGraph();
  }
}
