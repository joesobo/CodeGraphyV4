import * as vscode from 'vscode';
import { PasteClipboardFilesAction } from '../../../../actions/clipboardFiles/action';
import {
  graphClipboardFiles,
  type ClipboardFilesState,
} from '../../../../actions/clipboardFiles/state';
import type { GraphViewProviderMessageListenerSource } from '../listener';
import type { GraphViewProviderMessageListenerDependencies } from '../listener';
import { closeGraphViewFileEditor } from '../../../files/closeEditor';
import type { GraphViewProviderPrimaryActions } from './types';

type WorkspaceFileActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'showOpenDialog'
  | 'createDirectory'
  | 'writeFile'
  | 'copyFile'
  | 'cutFiles'
  | 'copyFiles'
  | 'pasteFiles'
  | 'findInFolder'
  | 'closeFileEditor'
>;

export function createWorkspaceFileActions(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
  clipboardFiles: ClipboardFilesState = graphClipboardFiles,
): WorkspaceFileActions {
  const getWorkspaceUri = (): vscode.Uri | undefined =>
    dependencies.workspace.workspaceFolders?.[0]?.uri;

  return {
    showOpenDialog: options => dependencies.window.showOpenDialog(options),
    createDirectory: uri => vscode.workspace.fs.createDirectory(uri),
    writeFile: (uri, content) => vscode.workspace.fs.writeFile(uri, content),
    copyFile: (sourceUri, destinationUri, options) =>
      vscode.workspace.fs.copy(sourceUri, destinationUri, options),
    findInFolder: async filePath => {
      await vscode.commands.executeCommand(
        'workbench.action.findInFiles',
        { filesToInclude: filePath },
      );
    },
    closeFileEditor: async filePath => {
      const workspaceUri = getWorkspaceUri();
      if (!workspaceUri) return;
      await closeGraphViewFileEditor(filePath, {
        closeTabs: (tabs, preserveFocus) => vscode.window.tabGroups.close(tabs, preserveFocus),
        getTabUri: tab => tab.input instanceof vscode.TabInputText ? tab.input.uri : undefined,
        joinPath: (base, path) => vscode.Uri.joinPath(base, path),
        tabs: vscode.window.tabGroups.all.flatMap(group => group.tabs),
        workspaceFolder: workspaceUri,
      });
    },
    cutFiles: async paths => {
      const workspaceUri = getWorkspaceUri();
      if (workspaceUri) clipboardFiles.stage('cut', paths, workspaceUri);
    },
    copyFiles: async paths => {
      const workspaceUri = getWorkspaceUri();
      if (workspaceUri) clipboardFiles.stage('copy', paths, workspaceUri);
    },
    pasteFiles: async directory => {
      const snapshot = clipboardFiles.read();
      const workspaceUri = getWorkspaceUri();
      if (!snapshot || !workspaceUri) return;

      if (snapshot.mode === 'cut' && snapshot.paths.length > 1) {
        const confirmation = await dependencies.window.showWarningMessage?.(
          `Move ${snapshot.paths.length} items to "${directory}"?`,
          { modal: true },
          'Move',
        );
        if (confirmation !== 'Move') return;
      }

      await dependencies.executeUndoAction(new PasteClipboardFilesAction(
        snapshot,
        workspaceUri,
        directory,
        () => source._analyzeAndSendData(),
      ));
      clipboardFiles.completePaste(snapshot);
    },
  };
}
