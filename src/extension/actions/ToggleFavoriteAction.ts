/**
 * @fileoverview Undoable action for toggling favorites.
 * @module extension/actions/ToggleFavoriteAction
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../UndoManager';

/**
 * Action for toggling favorite status of files.
 * Uses state-based undo (stores full state before/after) for robustness
 * against external modifications (e.g., VSCode native undo of renames).
 */
export class ToggleFavoriteAction implements IUndoableAction {
  readonly description: string;
  
  /** Full favorites state BEFORE this action was executed */
  private _stateBefore: string[] = [];
  /** Full favorites state AFTER this action was executed */
  private _stateAfter: string[] = [];
  /** Whether this action has been executed at least once */
  private _hasExecuted = false;

  /**
   * Creates a new ToggleFavoriteAction.
   * @param paths - File paths to toggle
   * @param sendFavorites - Callback to notify webview of changes
   */
  constructor(
    private readonly _paths: string[],
    private readonly _sendFavorites: () => void
  ) {
    this.description = _paths.length === 1
      ? `Toggle favorite: ${_paths[0].split('/').pop()}`
      : `Toggle ${_paths.length} favorites`;
  }

  async execute(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codegraphy');
    const currentFavorites = config.get<string[]>('favorites', []);
    
    // Only capture "before" state on first execution
    // On redo, we restore to the same "after" state
    if (!this._hasExecuted) {
      this._stateBefore = [...currentFavorites];
      
      // Calculate new state by toggling the paths
      const favSet = new Set<string>(currentFavorites);
      for (const path of this._paths) {
        if (favSet.has(path)) {
          favSet.delete(path);
        } else {
          favSet.add(path);
        }
      }
      this._stateAfter = Array.from(favSet);
      this._hasExecuted = true;
    }

    // Apply the "after" state
    await config.update('favorites', this._stateAfter, vscode.ConfigurationTarget.Workspace);
    this._sendFavorites();
  }

  async undo(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codegraphy');
    
    // Restore to the "before" state (full replacement, not delta)
    await config.update('favorites', this._stateBefore, vscode.ConfigurationTarget.Workspace);
    this._sendFavorites();
  }
}
