import * as vscode from 'vscode';
import { getUndoManager } from '../../../undoManager';
import { CreateFileAction } from '../../../actions/createFile';
import { CreateFolderAction } from '../../../actions/createFolder';
import { DeleteFilesAction } from '../../../actions/deleteFiles';
import { RenameFileAction } from '../../../actions/renameFile';
import { ToggleFavoriteAction } from '../../../actions/toggleFavorite';
import { createGraphViewFile, createGraphViewFolder, deleteGraphViewFiles } from '../../files/actions';
import { renameGraphViewFile } from '../../files/rename';
import { toggleGraphViewFavorites } from '../../favorites';
import {
  copyGraphViewProviderTextToClipboard,
  openGraphViewProviderFile,
  revealGraphViewProviderFileInExplorer,
} from './navigation';
import type { GraphViewProviderFileActionMethodDependencies } from './contracts';

function getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0]
    ?? (vscode.window.activeTextEditor
      ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
      : undefined);
}

export const DEFAULT_GRAPH_VIEW_FILE_ACTION_DEPENDENCIES: GraphViewProviderFileActionMethodDependencies = {
  openFile: openGraphViewProviderFile,
  revealFile: revealGraphViewProviderFileInExplorer,
  copyText: copyGraphViewProviderTextToClipboard,
  deleteFiles: deleteGraphViewFiles,
  renameFile: renameGraphViewFile,
  createFile: createGraphViewFile,
  createFolder: createGraphViewFolder,
  toggleFavorites: toggleGraphViewFavorites,
  getWorkspaceFolder: getCurrentWorkspaceFolder,
  showWarningMessage: (message, options, deleteAction) =>
    options.modal
      ? vscode.window.showQuickPick([deleteAction], {
        title: message,
        ignoreFocusOut: true,
      }) as Thenable<'Delete' | undefined>
      : vscode.window.showWarningMessage(message, options, deleteAction) as Thenable<
        'Delete' | undefined
      >,
  showInputBox: options => vscode.window.showInputBox(options),
  showErrorMessage: message => { vscode.window.showErrorMessage(message); },
  createDeleteAction: (paths, workspaceFolderUri, analyzeAndSendData) =>
    new DeleteFilesAction(paths, workspaceFolderUri, analyzeAndSendData),
  createRenameAction: (oldPath, newPath, workspaceFolderUri, analyzeAndSendData) =>
    new RenameFileAction(oldPath, newPath, workspaceFolderUri, analyzeAndSendData),
  createCreateAction: (filePath, workspaceFolderUri, analyzeAndSendData) =>
    new CreateFileAction(filePath, workspaceFolderUri, analyzeAndSendData),
  createCreateFolderAction: (folderPath, workspaceFolderUri, analyzeAndSendData) =>
    new CreateFolderAction(folderPath, workspaceFolderUri, analyzeAndSendData),
  createToggleFavoriteAction: (paths, sendFavorites) =>
    new ToggleFavoriteAction(paths, sendFavorites),
  executeUndoAction: action => getUndoManager().execute(action),
};
