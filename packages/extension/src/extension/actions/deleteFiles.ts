/**
 * @fileoverview Undoable action for deleting files.
 * @module extension/actions/deleteFiles
 */

import * as vscode from 'vscode';
import { IUndoableAction } from '../undoManager';
import { getCodeGraphyConfiguration } from '../repoSettings/current';

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
  /** Stored folder paths for restoration */
  private _storedDirectories: string[] = [];
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
    this._storedDirectories = [];

    // Store favorites state before deletion
    const config = getCodeGraphyConfiguration();
    this._favoritesBefore = [...config.get<string[]>('favorites', [])];
    
    // Calculate new favorites (remove deleted files)
    this._favoritesAfter = this._favoritesBefore.filter(fav =>
      !this._paths.some(deletedPath => isPathWithinDeletedPath(fav, deletedPath))
    );

    for (const filePath of this._paths) {
      const fileUri = vscode.Uri.joinPath(this._workspaceFolder, filePath);
      try {
        const stat = await vscode.workspace.fs.stat(fileUri);
        if (isDirectoryStat(stat)) {
          await this._storeDirectory(filePath, fileUri);
          await vscode.workspace.fs.delete(fileUri, { recursive: true, useTrash: true });
        } else {
          const content = await vscode.workspace.fs.readFile(fileUri);
          this._storedFiles.push({ path: filePath, content });
          // Delete to trash for extra safety
          await vscode.workspace.fs.delete(fileUri, { useTrash: true });
        }
      } catch (error) {
        console.error(`[CodeGraphy] Failed to delete ${filePath}:`, error);
        // Continue with other files
      }
    }

    // Update favorites (remove deleted files from favorites)
    await config.update('favorites', this._favoritesAfter);

    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    // Restore directories first so nested files have parents.
    for (const directoryPath of [...this._storedDirectories].sort(comparePathDepth)) {
      const directoryUri = vscode.Uri.joinPath(this._workspaceFolder, directoryPath);
      try {
        await vscode.workspace.fs.createDirectory(directoryUri);
      } catch (error) {
        console.error(`[CodeGraphy] Failed to restore ${directoryPath}:`, error);
        vscode.window.showErrorMessage(`Failed to restore ${directoryPath}`);
      }
    }

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
    const config = getCodeGraphyConfiguration();
    await config.update('favorites', this._favoritesBefore);

    await this._refreshGraph();
  }

  private async _storeDirectory(directoryPath: string, directoryUri: vscode.Uri): Promise<void> {
    this._storedDirectories.push(directoryPath);

    const entries = await vscode.workspace.fs.readDirectory(directoryUri);
    for (const [entryName, entryType] of entries) {
      const entryPath = `${directoryPath}/${entryName}`;
      const entryUri = vscode.Uri.joinPath(directoryUri, entryName);

      if ((entryType & vscode.FileType.Directory) !== 0) {
        await this._storeDirectory(entryPath, entryUri);
        continue;
      }

      const content = await vscode.workspace.fs.readFile(entryUri);
      this._storedFiles.push({ path: entryPath, content });
    }
  }
}

function isDirectoryStat(stat: vscode.FileStat): boolean {
  return (stat.type & vscode.FileType.Directory) !== 0;
}

function isPathWithinDeletedPath(path: string, deletedPath: string): boolean {
  return path === deletedPath || path.startsWith(`${deletedPath}/`);
}

function comparePathDepth(left: string, right: string): number {
  return left.split('/').length - right.split('/').length;
}
