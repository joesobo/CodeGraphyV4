import * as vscode from 'vscode';
import type { ReadWorkspaceFile } from '../scenarios/fileMutation/snapshot';
import type { ExplorerMeasurementDisposable } from './measurement';

export interface ExplorerComparisonRuntime {
  applyRenameFile: (oldUri: vscode.Uri, newUri: vscode.Uri) => Promise<boolean>;
  applyCreateFile: (uri: vscode.Uri) => Promise<boolean>;
  applyDeleteFile: (uri: vscode.Uri) => Promise<boolean>;
  joinPath: (workspaceFolderUri: vscode.Uri, path: string) => vscode.Uri;
  now: () => number;
  onDidRenameFiles: (
    listener: (event: vscode.FileRenameEvent) => void,
  ) => ExplorerMeasurementDisposable;
  onDidCreateFiles: (
    listener: (event: vscode.FileCreateEvent) => void,
  ) => ExplorerMeasurementDisposable;
  onDidDeleteFiles: (
    listener: (event: vscode.FileDeleteEvent) => void,
  ) => ExplorerMeasurementDisposable;
  readFile: ReadWorkspaceFile;
  revealInExplorer: (uri: vscode.Uri) => Promise<void>;
  showExplorer: () => Promise<void>;
  waitForComparisonQuietWindow?: () => Promise<void>;
  waitForWorkbenchDispatchTurn: () => Promise<void>;
  writeFile: (uri: vscode.Uri, contents: Uint8Array) => Promise<void>;
}

async function applyWorkspaceEdit(
  configure: (edit: vscode.WorkspaceEdit) => void,
): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();
  configure(edit);
  // workspace.applyEdit is the prompt-free public entry into the same VS Code
  // file-operation service used by Explorer mutations. Unlike direct
  // workspace.fs calls, it also emits the public onDid*Files completion events.
  return vscode.workspace.applyEdit(edit);
}

export const explorerComparisonRuntime: ExplorerComparisonRuntime = {
  applyRenameFile: (oldUri, newUri) => applyWorkspaceEdit((edit) => {
    edit.renameFile(oldUri, newUri, { ignoreIfExists: false, overwrite: false });
  }),
  applyCreateFile: uri => applyWorkspaceEdit((edit) => {
    edit.createFile(uri, { ignoreIfExists: false, overwrite: false });
  }),
  applyDeleteFile: uri => applyWorkspaceEdit((edit) => {
    edit.deleteFile(uri, { ignoreIfNotExists: false, recursive: false });
  }),
  joinPath: (workspaceFolderUri, path) =>
    vscode.Uri.joinPath(workspaceFolderUri, ...path.split('/')),
  now: () => performance.now(),
  onDidRenameFiles: listener => vscode.workspace.onDidRenameFiles(listener),
  onDidCreateFiles: listener => vscode.workspace.onDidCreateFiles(listener),
  onDidDeleteFiles: listener => vscode.workspace.onDidDeleteFiles(listener),
  readFile: async (workspaceFolderUri, path) => {
    const uri = vscode.Uri.joinPath(workspaceFolderUri, ...path.split('/'));
    try {
      await vscode.workspace.fs.stat(uri);
    } catch {
      return undefined;
    }
    return vscode.workspace.fs.readFile(uri);
  },
  revealInExplorer: async (uri) => {
    await vscode.commands.executeCommand('revealInExplorer', uri);
  },
  showExplorer: async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
  },
  waitForComparisonQuietWindow: () => new Promise(resolve => setTimeout(resolve, 500)),
  waitForWorkbenchDispatchTurn: () => new Promise(resolve => setImmediate(resolve)),
  writeFile: async (uri, contents) => {
    await vscode.workspace.fs.writeFile(uri, contents);
  },
};
