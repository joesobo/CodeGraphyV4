/**
 * @fileoverview Undoable action for renaming files.
 * @module extension/actions/RenameFileAction
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../UndoManager';

/**
 * Action for renaming a file with undo support.
 * Tracks old and new paths to reverse the rename.
 * Uses state-based undo for favorites to handle external modifications gracefully.
 */
export class RenameFileAction implements IUndoableAction {
  readonly description: string;

  /** Full favorites state BEFORE this action was executed */
  private _favoritesBefore: string[] = [];
  /** Full favorites state AFTER this action was executed */
  private _favoritesAfter: string[] = [];
  /** Whether this action has been executed at least once */
  private _hasExecuted = false;

  /**
   * Creates a new RenameFileAction.
   * @param oldPath - Original file path (workspace-relative)
   * @param newPath - New file path (workspace-relative)
   * @param workspaceFolder - The workspace folder URI
   * @param refreshGraph - Callback to refresh the graph after changes
   */
  constructor(
    private readonly _oldPath: string,
    private readonly _newPath: string,
    private readonly _workspaceFolder: vscode.Uri,
    private readonly _refreshGraph: () => Promise<void>
  ) {
    const oldName = _oldPath.split('/').pop();
    const newName = _newPath.split('/').pop();
    this.description = `Rename: ${oldName} → ${newName}`;
  }

  async execute(): Promise<void> {
    const oldUri = vscode.Uri.joinPath(this._workspaceFolder, this._oldPath);
    const newUri = vscode.Uri.joinPath(this._workspaceFolder, this._newPath);

    const config = vscode.workspace.getConfiguration('codegraphy');
    const currentFavorites = config.get<string[]>('favorites', []);
    
    // Only capture "before" state on first execution
    if (!this._hasExecuted) {
      this._favoritesBefore = [...currentFavorites];
      
      // Calculate new favorites state (update path if file was favorited)
      this._favoritesAfter = currentFavorites.map(f => 
        f === this._oldPath ? this._newPath : f
      );
      this._hasExecuted = true;
    }

    // Rename the file
    await vscode.workspace.fs.rename(oldUri, newUri);

    // Only update favorites if the file was in favorites (state actually changed)
    const favoritesChanged = this._favoritesBefore.includes(this._oldPath);
    if (favoritesChanged) {
      await config.update('favorites', this._favoritesAfter, vscode.ConfigurationTarget.Workspace);
    }

    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    // Reverse the rename
    const oldUri = vscode.Uri.joinPath(this._workspaceFolder, this._oldPath);
    const newUri = vscode.Uri.joinPath(this._workspaceFolder, this._newPath);

    await vscode.workspace.fs.rename(newUri, oldUri);

    // Only restore favorites if the file was originally in favorites
    const favoritesChanged = this._favoritesBefore.includes(this._oldPath);
    if (favoritesChanged) {
      const config = vscode.workspace.getConfiguration('codegraphy');
      await config.update('favorites', this._favoritesBefore, vscode.ConfigurationTarget.Workspace);
    }

    await this._refreshGraph();
  }
}
