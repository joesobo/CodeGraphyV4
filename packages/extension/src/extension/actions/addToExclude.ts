/**
 * @fileoverview Undoable action for adding patterns to filterPatterns.
 * @module extension/actions/addToExclude
 */

import { IUndoableAction } from '../undoManager';
import {
  getCodeGraphyConfiguration,
  updateCodeGraphyConfigurationSilently,
} from '../repoSettings/current';

/**
 * Action for adding patterns to repo-local filterPatterns.
 * Uses state-based undo (stores full state before/after) for robustness
 * against external modifications.
 */
export class AddToExcludeAction implements IUndoableAction {
  readonly description: string;
  
  /** Full filter-pattern state BEFORE this action was executed */
  private _stateBefore: string[] = [];
  /** Full filter-pattern state AFTER this action was executed */
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
    const config = getCodeGraphyConfiguration();
    const currentFilterPatterns = config.get<string[]>('filterPatterns', []);
    
    // Only capture "before" state on first execution
    if (!this._hasExecuted) {
      this._stateBefore = [...currentFilterPatterns];
      
      // Calculate new state by adding patterns
      const excludeSet = new Set<string>(currentFilterPatterns);
      for (const path of this._paths) {
        const pattern = `**/${path}`;
        excludeSet.add(pattern);
      }
      this._stateAfter = Array.from(excludeSet);
      this._hasExecuted = true;
    }

    // Apply the "after" state
    await updateCodeGraphyConfigurationSilently('filterPatterns', this._stateAfter);
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    // Restore to the "before" state (full replacement)
    await updateCodeGraphyConfigurationSilently('filterPatterns', this._stateBefore);
    await this._refreshGraph();
  }
}
