/**
 * @fileoverview Undoable action for adding patterns to exclude list.
 * @module extension/actions/AddToExcludeAction
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../UndoManager';

/**
 * Action for adding patterns to the exclude list.
 * Uses state-based undo (stores full state before/after) for robustness
 * against external modifications.
 */
export class AddToExcludeAction implements IUndoableAction {
  readonly description: string;
  
  /** Full exclude state BEFORE this action was executed */
  private _stateBefore: string[] = [];
  /** Full exclude state AFTER this action was executed */
  private _stateAfter: string[] = [];
  /** Whether this action has been executed at least once */
  private _hasExecuted = false;

  /**
   * Creates a new AddToExcludeAction.
   * @param paths - File paths to exclude
   * @param refreshGraph - Callback to refresh the graph after changes
   */
  constructor(
    private readonly _paths: string[],
    private readonly _refreshGraph: () => Promise<void>
  ) {
    this.description = _paths.length === 1
      ? `Exclude: ${_paths[0].split('/').pop()}`
      : `Exclude ${_paths.length} files`;
  }

  async execute(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codegraphy');
    const currentExclude = config.get<string[]>('exclude', []);
    
    // Only capture "before" state on first execution
    if (!this._hasExecuted) {
      this._stateBefore = [...currentExclude];
      
      // Calculate new state by adding patterns
      const excludeSet = new Set<string>(currentExclude);
      for (const path of this._paths) {
        const pattern = `**/${path}`;
        excludeSet.add(pattern);
      }
      this._stateAfter = Array.from(excludeSet);
      this._hasExecuted = true;
    }

    // Apply the "after" state
    await config.update('exclude', this._stateAfter, vscode.ConfigurationTarget.Workspace);
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codegraphy');
    
    // Restore to the "before" state (full replacement)
    await config.update('exclude', this._stateBefore, vscode.ConfigurationTarget.Workspace);
    await this._refreshGraph();
  }
}
