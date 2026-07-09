import type * as vscode from 'vscode';
import type { FileMutationTarget } from '../scenarios/fileMutation/targets';
import type { ExplorerMeasurementDisposable } from './measurement';
import type { ExplorerComparisonRuntime } from './runtime';

export type ExplorerMutationWorkspaceEvent =
  | vscode.FileRenameEvent
  | vscode.FileCreateEvent
  | vscode.FileDeleteEvent;

export interface ExplorerMutationAdapter {
  label: 'rename' | 'create' | 'delete';
  apply: () => Promise<boolean>;
  matches: (event: ExplorerMutationWorkspaceEvent) => boolean;
  visibilityUri: vscode.Uri;
  subscribe: (
    listener: (event: ExplorerMutationWorkspaceEvent) => void,
  ) => ExplorerMeasurementDisposable;
}

function sameUri(left: vscode.Uri, right: vscode.Uri): boolean {
  return left.fsPath === right.fsPath;
}

function parentUri(
  workspaceFolderUri: vscode.Uri,
  filePath: string,
  runtime: ExplorerComparisonRuntime,
): vscode.Uri {
  const separatorIndex = filePath.lastIndexOf('/');
  return separatorIndex < 0
    ? workspaceFolderUri
    : runtime.joinPath(workspaceFolderUri, filePath.slice(0, separatorIndex));
}

export function createExplorerMutationAdapter(
  target: FileMutationTarget,
  workspaceFolderUri: vscode.Uri,
  runtime: ExplorerComparisonRuntime,
): ExplorerMutationAdapter {
  const mutation = target.mutation;
  switch (mutation.kind) {
    case 'rename': {
      const oldUri = runtime.joinPath(workspaceFolderUri, mutation.oldPath);
      const newUri = runtime.joinPath(workspaceFolderUri, mutation.newPath);
      return {
        label: 'rename',
        apply: () => runtime.applyRenameFile(oldUri, newUri),
        matches: event => (event as vscode.FileRenameEvent).files.some(file =>
          sameUri(file.oldUri, oldUri) && sameUri(file.newUri, newUri)),
        subscribe: listener => runtime.onDidRenameFiles(event => listener(event)),
        visibilityUri: newUri,
      };
    }
    case 'create': {
      const uri = runtime.joinPath(workspaceFolderUri, mutation.filePath);
      return {
        label: 'create',
        apply: () => runtime.applyCreateFile(uri),
        matches: event => (event as vscode.FileCreateEvent).files
          .some(file => sameUri(file, uri)),
        subscribe: listener => runtime.onDidCreateFiles(event => listener(event)),
        visibilityUri: uri,
      };
    }
    case 'delete': {
      const path = mutation.paths[0];
      if (!path) {
        throw new Error('Explorer delete comparison requires exactly one target');
      }
      const uri = runtime.joinPath(workspaceFolderUri, path);
      return {
        label: 'delete',
        apply: () => runtime.applyDeleteFile(uri),
        matches: event => (event as vscode.FileDeleteEvent).files
          .some(file => sameUri(file, uri)),
        subscribe: listener => runtime.onDidDeleteFiles(event => listener(event)),
        visibilityUri: parentUri(workspaceFolderUri, path, runtime),
      };
    }
  }
}
