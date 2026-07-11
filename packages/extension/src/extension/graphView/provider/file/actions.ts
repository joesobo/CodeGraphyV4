import * as vscode from 'vscode';
import { getUndoManager } from '../../../undoManager';
import type { IUndoableAction } from '../../../undoManager';
import { CreateFolderAction } from '../../../actions/createFolder';
import { ToggleFavoriteAction } from '../../../actions/toggleFavorite';
import { createGraphViewFile, createGraphViewFolder, deleteGraphViewFiles } from '../../files/actions';
import { renameGraphViewFile } from '../../files/rename';
import { toggleGraphViewFavorites } from '../../favorites';
import {
  copyGraphViewProviderTextToClipboard,
  openGraphViewProviderFile,
  revealGraphViewProviderFileInExplorer,
  type GraphViewProviderFileNavigationSource,
} from './navigation';
import { executeWorkspaceFileMutation } from './mutations';

type EditorOpenBehavior = Pick<
  vscode.TextDocumentShowOptions,
  'preview' | 'preserveFocus' | 'viewColumn'
>;

function getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0]
    ?? (
      vscode.window.activeTextEditor
        ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
        : undefined
    );
}

export interface GraphViewProviderFileActionMethodsSource {
  _getFocusedFile(): string | undefined;
  _analyzeAndSendData(): Promise<void>;
  _sendFavorites(favorites?: string[]): void;
  _setFocusedFile(filePath: string | undefined): void;
}

export interface GraphViewProviderFileActionMethods {
  _openFile(filePath: string, behavior?: EditorOpenBehavior): Promise<void>;
  _revealInExplorer(filePath: string): Promise<void>;
  _copyToClipboard(text: string): Promise<void>;
  _deleteFiles(paths: string[]): Promise<void>;
  _renameFile(filePath: string): Promise<void>;
  _createFile(directory: string): Promise<string | void>;
  _createFolder(directory: string): Promise<string | void>;
  _toggleFavorites(paths: string[]): Promise<void>;
}

export interface GraphViewProviderFileActionMethodDependencies {
  openFile: typeof openGraphViewProviderFile;
  revealFile: typeof revealGraphViewProviderFileInExplorer;
  copyText: typeof copyGraphViewProviderTextToClipboard;
  deleteFiles: typeof deleteGraphViewFiles;
  renameFile: typeof renameGraphViewFile;
  createFile: typeof createGraphViewFile;
  createFolder: typeof createGraphViewFolder;
  toggleFavorites: typeof toggleGraphViewFavorites;
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  showWarningMessage(
    message: string,
    options: vscode.MessageOptions,
    deleteAction: string,
  ): Thenable<'Delete' | undefined>;
  showInputBox: typeof vscode.window.showInputBox;
  showErrorMessage(message: string): void;
  createCreateFolderAction(
    folderPath: string,
    workspaceFolderUri: vscode.Uri,
    analyzeAndSendData: () => Promise<void>,
  ): IUndoableAction;
  createToggleFavoriteAction(paths: string[], sendFavorites: (favorites: string[]) => void): IUndoableAction;
  executeUndoAction(action: IUndoableAction): Promise<void>;
  executeWorkspaceFileMutation: typeof executeWorkspaceFileMutation;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderFileActionMethodDependencies = {
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
  showErrorMessage: message => {
    vscode.window.showErrorMessage(message);
  },
  createCreateFolderAction: (folderPath, workspaceFolderUri, analyzeAndSendData) =>
    new CreateFolderAction(folderPath, workspaceFolderUri, analyzeAndSendData),
  createToggleFavoriteAction: (paths, sendFavorites) =>
    new ToggleFavoriteAction(paths, sendFavorites),
  executeUndoAction: action => getUndoManager().execute(action),
  executeWorkspaceFileMutation,
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
      _getFocusedFile: () => source._getFocusedFile(),
      _setFocusedFile: filePath => source._setFocusedFile(filePath),
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
    const workspaceFolder = dependencies.getWorkspaceFolder();
    await dependencies.deleteFiles(paths, {
      workspaceFolder,
      showWarningMessage: (message, options, deleteAction) =>
        dependencies.showWarningMessage(message, options, deleteAction) as PromiseLike<
          typeof deleteAction | undefined
        >,
      executeDeleteAction: async (nextPaths, workspaceFolderUri) => {
        await dependencies.executeWorkspaceFileMutation(
          { kind: 'delete', paths: nextPaths },
          {
            workspaceFolderUri,
            refreshGraph: () => source._analyzeAndSendData(),
          },
        );
      },
    });
  };

  const _renameFile = async (filePath: string): Promise<void> => {
    await dependencies.renameFile(filePath, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      showInputBox: options => dependencies.showInputBox(options),
      executeRenameAction: async (oldPath, newPath, workspaceFolderUri) => {
        await dependencies.executeWorkspaceFileMutation(
          { kind: 'rename', oldPath, newPath },
          {
            workspaceFolderUri,
            refreshGraph: () => source._analyzeAndSendData(),
          },
        );
      },
      showErrorMessage: message => {
        dependencies.showErrorMessage(message);
      },
    });
  };

  const _createFile = async (directory: string): Promise<string | void> => {
    return dependencies.createFile(directory, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      showInputBox: options => dependencies.showInputBox(options),
      executeCreateAction: async (filePath, workspaceFolderUri) => {
        await dependencies.executeWorkspaceFileMutation(
          { kind: 'create', filePath },
          {
            workspaceFolderUri,
            refreshGraph: () => source._analyzeAndSendData(),
          },
        );
      },
      showErrorMessage: message => {
        dependencies.showErrorMessage(message);
      },
    });
  };

  const _createFolder = async (directory: string): Promise<string | void> => {
    return dependencies.createFolder(directory, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      showInputBox: options => dependencies.showInputBox(options),
      executeCreateFolderAction: async (folderPath, workspaceFolderUri) => {
        const action = dependencies.createCreateFolderAction(
          folderPath,
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
        const action = dependencies.createToggleFavoriteAction(nextPaths, favorites =>
          source._sendFavorites(favorites),
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
    _createFolder,
    _toggleFavorites,
  };
}
