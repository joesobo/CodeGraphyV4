import * as vscode from 'vscode';
import { getUndoManager } from '../../../undoManager';
import type { IUndoableAction } from '../../../undoManager';
import { CreateFileAction } from '../../../actions/createFile';
import { DeleteFilesAction } from '../../../actions/deleteFiles';
import { RenameFileAction } from '../../../actions/renameFile';
import { ToggleFavoriteAction } from '../../../actions/toggleFavorite';
import { createGraphViewFile, deleteGraphViewFiles } from '../../files/actions';
import { renameGraphViewFile } from '../../files/rename';
import { toggleGraphViewFavorites } from '../../favorites';
import {
  copyGraphViewProviderTextToClipboard,
  openGraphViewProviderFile,
  revealGraphViewProviderFileInExplorer,
  type GraphViewProviderFileNavigationSource,
} from './navigation';

type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

export interface GraphViewProviderFileActionMethodsSource {
  _incrementVisitCount(filePath: string): Promise<void>;
  _analyzeAndSendData(): Promise<void>;
  _sendFavorites(): void;
}

export interface GraphViewProviderFileActionMethods {
  _openFile(filePath: string, behavior?: EditorOpenBehavior): Promise<void>;
  _revealInExplorer(filePath: string): Promise<void>;
  _copyToClipboard(text: string): Promise<void>;
  _deleteFiles(paths: string[]): Promise<void>;
  _renameFile(filePath: string): Promise<void>;
  _createFile(directory: string): Promise<void>;
  _toggleFavorites(paths: string[]): Promise<void>;
}

export interface GraphViewProviderFileActionMethodDependencies {
  openFile: typeof openGraphViewProviderFile;
  revealFile: typeof revealGraphViewProviderFileInExplorer;
  copyText: typeof copyGraphViewProviderTextToClipboard;
  deleteFiles: typeof deleteGraphViewFiles;
  renameFile: typeof renameGraphViewFile;
  createFile: typeof createGraphViewFile;
  toggleFavorites: typeof toggleGraphViewFavorites;
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  showWarningMessage(
    message: string,
    options: vscode.MessageOptions,
    deleteAction: string,
  ): Thenable<'Delete' | undefined>;
  showInputBox: typeof vscode.window.showInputBox;
  showErrorMessage(message: string): void;
  createDeleteAction(
    paths: string[],
    workspaceFolderUri: vscode.Uri,
    analyzeAndSendData: () => Promise<void>,
  ): IUndoableAction;
  createRenameAction(
    oldPath: string,
    newPath: string,
    workspaceFolderUri: vscode.Uri,
    analyzeAndSendData: () => Promise<void>,
  ): IUndoableAction;
  createCreateAction(
    filePath: string,
    workspaceFolderUri: vscode.Uri,
    analyzeAndSendData: () => Promise<void>,
  ): IUndoableAction;
  createToggleFavoriteAction(paths: string[], sendFavorites: () => void): IUndoableAction;
  executeUndoAction(action: IUndoableAction): Promise<void>;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderFileActionMethodDependencies = {
  openFile: openGraphViewProviderFile,
  revealFile: revealGraphViewProviderFileInExplorer,
  copyText: copyGraphViewProviderTextToClipboard,
  deleteFiles: deleteGraphViewFiles,
  renameFile: renameGraphViewFile,
  createFile: createGraphViewFile,
  toggleFavorites: toggleGraphViewFavorites,
  getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
  showWarningMessage: (message, options, deleteAction) =>
    vscode.window.showWarningMessage(message, options, deleteAction) as Thenable<
      'Delete' | undefined
    >,
  showInputBox: options => vscode.window.showInputBox(options),
  showErrorMessage: message => {
    vscode.window.showErrorMessage(message);
  },
  createDeleteAction: (paths, workspaceFolderUri, analyzeAndSendData) =>
    new DeleteFilesAction(paths, workspaceFolderUri, analyzeAndSendData),
  createRenameAction: (oldPath, newPath, workspaceFolderUri, analyzeAndSendData) =>
    new RenameFileAction(oldPath, newPath, workspaceFolderUri, analyzeAndSendData),
  createCreateAction: (filePath, workspaceFolderUri, analyzeAndSendData) =>
    new CreateFileAction(filePath, workspaceFolderUri, analyzeAndSendData),
  createToggleFavoriteAction: (paths, sendFavorites) =>
    new ToggleFavoriteAction(paths, sendFavorites),
  executeUndoAction: action => getUndoManager().execute(action),
};

export function createGraphViewProviderFileActionMethods(
  source: GraphViewProviderFileActionMethodsSource,
  dependencies: GraphViewProviderFileActionMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderFileActionMethods {
  const _openFile = async (
    filePath: string,
    behavior: EditorOpenBehavior = { preview: false, preserveFocus: false },
  ): Promise<void> => {
    const navigationSource: GraphViewProviderFileNavigationSource = {
      _incrementVisitCount: nextFilePath => source._incrementVisitCount(nextFilePath),
    };
    await dependencies.openFile(navigationSource, filePath, behavior);
  };

  const _revealInExplorer = async (filePath: string): Promise<void> => {
    await dependencies.revealFile(filePath);
  };

  const _copyToClipboard = async (text: string): Promise<void> => {
    await dependencies.copyText(text);
  };

  const _deleteFiles = async (paths: string[]): Promise<void> => {
    await dependencies.deleteFiles(paths, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      showWarningMessage: (message, options, deleteAction) =>
        dependencies.showWarningMessage(message, options, deleteAction) as PromiseLike<
          typeof deleteAction | undefined
        >,
      executeDeleteAction: async (nextPaths, workspaceFolderUri) => {
        const action = dependencies.createDeleteAction(
          nextPaths,
          workspaceFolderUri,
          () => source._analyzeAndSendData(),
        );
        await dependencies.executeUndoAction(action);
      },
    });
  };

  const _renameFile = async (filePath: string): Promise<void> => {
    await dependencies.renameFile(filePath, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      showInputBox: options => dependencies.showInputBox(options),
      executeRenameAction: async (oldPath, newPath, workspaceFolderUri) => {
        const action = dependencies.createRenameAction(
          oldPath,
          newPath,
          workspaceFolderUri,
          () => source._analyzeAndSendData(),
        );
        await dependencies.executeUndoAction(action);
      },
      showErrorMessage: message => {
        dependencies.showErrorMessage(message);
      },
    });
  };

  const _createFile = async (directory: string): Promise<void> => {
    await dependencies.createFile(directory, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      showInputBox: options => dependencies.showInputBox(options),
      executeCreateAction: async (filePath, workspaceFolderUri) => {
        const action = dependencies.createCreateAction(
          filePath,
          workspaceFolderUri,
          () => source._analyzeAndSendData(),
        );
        await dependencies.executeUndoAction(action);
      },
      showErrorMessage: message => {
        dependencies.showErrorMessage(message);
      },
    });
  };

  const _toggleFavorites = async (paths: string[]): Promise<void> => {
    await dependencies.toggleFavorites(paths, {
      executeToggleFavoritesAction: async nextPaths => {
        const action = dependencies.createToggleFavoriteAction(nextPaths, () =>
          source._sendFavorites(),
        );
        await dependencies.executeUndoAction(action);
      },
    });
  };

  return {
    _openFile,
    _revealInExplorer,
    _copyToClipboard,
    _deleteFiles,
    _renameFile,
    _createFile,
    _toggleFavorites,
  };
}
