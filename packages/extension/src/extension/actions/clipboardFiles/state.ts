import type * as vscode from 'vscode';
import type { ClipboardFilesMode, ClipboardFilesSnapshot } from './action';

export class ClipboardFilesState {
  private _snapshot: ClipboardFilesSnapshot | undefined;

  stage(mode: ClipboardFilesMode, paths: readonly string[], workspaceFolder: vscode.Uri): void {
    this._snapshot = { mode, paths: [...paths], workspaceFolder };
  }

  read(): ClipboardFilesSnapshot | undefined {
    return this._snapshot;
  }

  completePaste(snapshot: ClipboardFilesSnapshot): void {
    if (this._snapshot === snapshot && snapshot.mode === 'cut') {
      this._snapshot = undefined;
    }
  }
}

export const graphClipboardFiles = new ClipboardFilesState();
