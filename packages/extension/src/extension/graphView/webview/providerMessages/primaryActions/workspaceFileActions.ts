import * as vscode from 'vscode';
import type { GraphViewProviderMessageListenerDependencies } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type WorkspaceFileActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'showOpenDialog'
  | 'createDirectory'
  | 'writeFile'
  | 'copyFile'
>;

export function createWorkspaceFileActions(
  dependencies: GraphViewProviderMessageListenerDependencies,
): WorkspaceFileActions {
  return {
    showOpenDialog: options => dependencies.window.showOpenDialog(options),
    createDirectory: uri => vscode.workspace.fs.createDirectory(uri),
    writeFile: (uri, content) => vscode.workspace.fs.writeFile(uri, content),
    copyFile: (sourceUri, destinationUri, options) =>
      vscode.workspace.fs.copy(sourceUri, destinationUri, options),
  };
}
