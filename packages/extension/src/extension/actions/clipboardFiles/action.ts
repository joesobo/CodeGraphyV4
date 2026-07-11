import * as vscode from 'vscode';
import type { IUndoableAction } from '../../undoManager';
import { existingNameError, resolveCollisionName } from './collision';

export type ClipboardFilesMode = 'copy' | 'cut';

export interface ClipboardFilesSnapshot {
  mode: ClipboardFilesMode;
  paths: readonly string[];
  workspaceFolder: vscode.Uri;
}

export interface ClipboardFileOperations {
  copy(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean }): Thenable<void>;
  delete(uri: vscode.Uri, options: { recursive: boolean; useTrash: boolean }): Thenable<void>;
  joinPath(base: vscode.Uri, ...segments: string[]): vscode.Uri;
  readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]>;
  rename(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean }): Thenable<void>;
  stat(uri: vscode.Uri): Thenable<vscode.FileStat>;
}

interface PlannedPaste {
  destination: vscode.Uri;
  destinationName: string;
  source: vscode.Uri;
}

const DEFAULT_OPERATIONS: ClipboardFileOperations = {
  copy: (source, destination, options) => vscode.workspace.fs.copy(source, destination, options),
  delete: (uri, options) => vscode.workspace.fs.delete(uri, options),
  joinPath: (base, ...segments) => vscode.Uri.joinPath(base, ...segments),
  readDirectory: uri => vscode.workspace.fs.readDirectory(uri),
  rename: (source, destination, options) => vscode.workspace.fs.rename(source, destination, options),
  stat: uri => vscode.workspace.fs.stat(uri),
};

export class PasteClipboardFilesAction implements IUndoableAction {
  readonly description: string;
  private _hasExecuted = false;
  private _plannedPastes: PlannedPaste[] | undefined;

  constructor(
    private readonly _snapshot: ClipboardFilesSnapshot,
    private readonly _destinationWorkspace: vscode.Uri,
    private readonly _destinationDirectory: string,
    private readonly _refreshGraph: () => Promise<void>,
    private readonly _operations: ClipboardFileOperations = DEFAULT_OPERATIONS,
  ) {
    const count = normalizeSelectedPaths(_snapshot.paths).length;
    this.description = `${_snapshot.mode === 'cut' ? 'Move' : 'Copy'} ${count} ${count === 1 ? 'item' : 'items'}`;
  }

  async execute(): Promise<void> {
    if (!this._plannedPastes) {
      this._plannedPastes = await this._planPastes();
    } else {
      await this._assertDestinationsAvailable(this._plannedPastes);
    }

    const completed: PlannedPaste[] = [];
    let mutationStarted = false;
    try {
      for (const planned of this._plannedPastes) {
        mutationStarted = true;
        await this._applyPaste(planned);
        completed.push(planned);
      }
      this._hasExecuted = true;
    } catch (error) {
      await this._rollbackCompleted(completed);
      throw error;
    } finally {
      if (mutationStarted) {
        await this._refreshGraph();
      }
    }
  }

  async undo(): Promise<void> {
    if (!this._hasExecuted || !this._plannedPastes) return;

    for (const planned of [...this._plannedPastes].reverse()) {
      if (this._snapshot.mode === 'copy') {
        await this._operations.delete(planned.destination, { recursive: true, useTrash: false });
      } else {
        await this._restoreCut(planned);
      }
    }
    await this._refreshGraph();
  }

  private async _planPastes(): Promise<PlannedPaste[]> {
    const paths = normalizeSelectedPaths(this._snapshot.paths);
    assertDestinationOutsideSources(
      paths,
      this._snapshot.workspaceFolder,
      this._destinationWorkspace,
      this._destinationDirectory,
    );

    const destinationDirectoryUri = this._operations.joinPath(
      this._destinationWorkspace,
      normalizeDirectory(this._destinationDirectory),
    );
    const siblingNames = new Set(
      (await this._operations.readDirectory(destinationDirectoryUri)).map(([name]) => name),
    );
    const planned: PlannedPaste[] = [];
    for (const path of paths) {
      const source = this._operations.joinPath(this._snapshot.workspaceFolder, path);
      const originalName = path.split('/').at(-1)!;
      const destinationName = await this._findAvailableName(
        destinationDirectoryUri,
        originalName,
        siblingNames,
      );
      siblingNames.add(destinationName);
      planned.push({
        destination: this._operations.joinPath(destinationDirectoryUri, destinationName),
        destinationName,
        source,
      });
    }
    return planned;
  }

  private async _findAvailableName(
    destinationDirectory: vscode.Uri,
    originalName: string,
    siblingNames: Set<string>,
  ): Promise<string> {
    while (true) {
      const candidate = resolveCollisionName(originalName, [...siblingNames]);
      if (!(await this._pathExists(this._operations.joinPath(destinationDirectory, candidate)))) {
        return candidate;
      }
      siblingNames.add(candidate);
    }
  }

  private async _assertDestinationsAvailable(plannedPastes: readonly PlannedPaste[]): Promise<void> {
    for (const planned of plannedPastes) {
      if (await this._pathExists(planned.destination)) {
        throw existingNameError(planned.destinationName);
      }
    }
  }

  private async _pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await this._operations.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private async _applyPaste(planned: PlannedPaste): Promise<void> {
    if (this._snapshot.mode === 'copy') {
      await this._operations.copy(planned.source, planned.destination, { overwrite: false });
      return;
    }

    if (sameWorkspace(this._snapshot.workspaceFolder, this._destinationWorkspace)) {
      await this._operations.rename(planned.source, planned.destination, { overwrite: false });
      return;
    }

    await this._operations.copy(planned.source, planned.destination, { overwrite: false });
    try {
      await this._operations.delete(planned.source, { recursive: true, useTrash: false });
    } catch (error) {
      await this._operations.delete(planned.destination, { recursive: true, useTrash: false });
      throw error;
    }
  }

  private async _rollbackCompleted(completed: readonly PlannedPaste[]): Promise<void> {
    for (const planned of [...completed].reverse()) {
      if (this._snapshot.mode === 'copy') {
        await this._operations.delete(planned.destination, { recursive: true, useTrash: false });
      } else {
        await this._restoreCut(planned);
      }
    }
  }

  private async _restoreCut(planned: PlannedPaste): Promise<void> {
    if (sameWorkspace(this._snapshot.workspaceFolder, this._destinationWorkspace)) {
      await this._operations.rename(planned.destination, planned.source, { overwrite: false });
      return;
    }

    await this._operations.copy(planned.destination, planned.source, { overwrite: false });
    await this._operations.delete(planned.destination, { recursive: true, useTrash: false });
  }
}

function normalizeSelectedPaths(paths: readonly string[]): string[] {
  const normalized = [...new Set(paths.map(normalizePath))];
  return normalized.filter(path =>
    !normalized.some(parent => parent !== path && path.startsWith(`${parent}/`))
  );
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized === '(root)' || normalized.split('/').includes('..')) {
    throw new Error(`Invalid workspace path: ${path}`);
  }
  return normalized;
}

function normalizeDirectory(directory: string): string {
  return directory === '.' ? '' : normalizePath(directory);
}

function sameWorkspace(first: vscode.Uri, second: vscode.Uri): boolean {
  return first.toString() === second.toString();
}

function assertDestinationOutsideSources(
  sourcePaths: readonly string[],
  sourceWorkspace: vscode.Uri,
  destinationWorkspace: vscode.Uri,
  destinationDirectory: string,
): void {
  if (!sameWorkspace(sourceWorkspace, destinationWorkspace) || destinationDirectory === '.') return;
  const destination = normalizeDirectory(destinationDirectory);
  if (sourcePaths.some(source => destination === source || destination.startsWith(`${source}/`))) {
    throw new Error('Cannot paste a folder into itself or one of its descendants.');
  }
}
