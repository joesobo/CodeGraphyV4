/**
 * @fileoverview Undoable action for deleting files.
 * @module extension/actions/DeleteFilesAction
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../UndoManager';

/**
 * Stored file data for restoration on undo.
 */
interface StoredFile {
  path: string;
  content: Uint8Array;
}

/**
 * Action for deleting files with undo support.
 * Stores file contents and favorites state before deletion so they can be restored.
 * Uses state-based undo for favorites to handle external modifications gracefully.
 */
export class DeleteFilesAction implements IUndoableAction {
  readonly description: string;

  /** Stored file contents for restoration */
  private _storedFiles: StoredFile[] = [];
  /** Full favorites state BEFORE this action was executed */
  private _favoritesBefore: string[] = [];
  /** Full favorites state AFTER this action was executed */
  private _favoritesAfter: string[] = [];

  /**
   * Creates a new DeleteFilesAction.
   * @param paths - File paths to delete (workspace-relative)
   * @param workspaceFolder - The workspace folder URI
   * @param refreshGraph - Callback to refresh the graph after changes
   */
  constructor(
    private readonly _paths: string[],
    private readonly _workspaceFolder: vscode.Uri,
    private readonly _refreshGraph: () => Promise<void>
  ) {
    this.description =
      _paths.length === 1
        ? `Delete: ${_paths[0].split('/').pop()}`
        : `Delete ${_paths.length} files`;
  }

  async execute(): Promise<void> {
    // Store file contents before deletion
    this._storedFiles = [];

    // Store favorites state before deletion
    const config = vscode.workspace.getConfiguration('codegraphy');
    this._favoritesBefore = [...config.get<string[]>('favorites', [])];
    
    // Calculate new favorites (remove deleted files)
    const deletedPaths = new Set(this._paths);
    this._favoritesAfter = this._favoritesBefore.filter(f => !deletedPaths.has(f));

    for (const filePath of this._paths) {
      const fileUri = vscode.Uri.joinPath(this._workspaceFolder, filePath);
      try {
        const content = await vscode.workspace.fs.readFile(fileUri);
        this._storedFiles.push({ path: filePath, content });
        // Delete to trash for extra safety
        await vscode.workspace.fs.delete(fileUri, { useTrash: true });
      } catch (error) {
        console.error(`[CodeGraphy] Failed to delete ${filePath}:`, error);
        // Continue with other files
      }
    }

    // Update favorites (remove deleted files from favorites)
    await config.update('favorites', this._favoritesAfter, vscode.ConfigurationTarget.Workspace);

    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    // Restore all stored files
    for (const storedFile of this._storedFiles) {
      const fileUri = vscode.Uri.joinPath(this._workspaceFolder, storedFile.path);
      try {
        await vscode.workspace.fs.writeFile(fileUri, storedFile.content);
      } catch (error) {
        console.error(`[CodeGraphy] Failed to restore ${storedFile.path}:`, error);
        vscode.window.showErrorMessage(`Failed to restore ${storedFile.path}`);
      }
    }

    // Restore favorites state (full replacement)
    const config = vscode.workspace.getConfiguration('codegraphy');
    await config.update('favorites', this._favoritesBefore, vscode.ConfigurationTarget.Workspace);

    await this._refreshGraph();
  }
}
