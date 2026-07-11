/**
 * @fileoverview Undoable action for deleting files.
 * @module extension/actions/deleteFiles
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../undoManager';
import { getCodeGraphyConfiguration } from '../repoSettings/current';
import { storePathForDeletion, type StoredFile } from './deleteFiles/backup';
import { filterFavoritesForDeletedPaths } from './deleteFiles/paths';
import { restoreDirectories, restoreFiles } from './deleteFiles/restore';

/**
 * Action for deleting files with undo support.
 * Stores file contents and favorites state before deletion so they can be restored.
 * Uses state-based undo for favorites to handle external modifications gracefully.
 */
export class DeleteFilesAction implements IUndoableAction {
  readonly description: string;

  /** Stored file contents for restoration */
  private _storedFiles: StoredFile[] = [];
  /** Stored folder paths for restoration */
  private _storedDirectories: string[] = [];
  /** Full favorites state BEFORE this action was executed */
  private _favoritesBefore: string[] = [];

  /**
   * Creates a new DeleteFilesAction.
   * @param paths - File paths to delete (workspace-relative)
   * @param workspaceFolder - The workspace folder URI
   * @param refreshGraph - Callback to refresh the graph after changes
   */
  constructor(
    private readonly _paths: string[],
    private readonly _workspaceFolder: vscode.Uri,
    private readonly _refreshGraph: () => Promise<void>,
    private readonly _useTrash = true,
  ) {
    this.description =
      _paths.length === 1
        ? `Delete: ${_paths[0].split('/').pop()}`
        : `Delete ${_paths.length} files`;
  }

  async execute(): Promise<void> {
    // Store file contents before deletion
    this._storedFiles = [];
    this._storedDirectories = [];

    // Store favorites state before deletion
    const config = getCodeGraphyConfiguration();
    this._favoritesBefore = [...config.get<string[]>('favorites', [])];

    // Calculate new favorites (remove deleted files)
    const favoritesAfter = filterFavoritesForDeletedPaths(this._favoritesBefore, this._paths);

    for (const filePath of this._paths) {
      try {
        await storePathForDeletion(
          this._workspaceFolder,
          filePath,
          this._storedDirectories,
          this._storedFiles,
          this._useTrash,
        );
      } catch (error) {
        console.error(`[CodeGraphy] Failed to delete ${filePath}:`, error);
        // Continue with other files
      }
    }

    // Update favorites (remove deleted files from favorites)
    await config.update('favorites', favoritesAfter);

    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    // Restore directories first so nested files have parents.
    await restoreDirectories(this._workspaceFolder, this._storedDirectories);

    // Restore all stored files
    await restoreFiles(this._workspaceFolder, this._storedFiles);

    // Restore favorites state (full replacement)
    const config = getCodeGraphyConfiguration();
    await config.update('favorites', this._favoritesBefore);

    await this._refreshGraph();
  }
}
