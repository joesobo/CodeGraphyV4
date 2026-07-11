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
import { executeWorkspaceFileMutation, workspaceFileMutationPaths } from './mutations';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';

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
  _sendMessage(message: ExtensionToWebviewMessage): void;
  refreshChangedFiles(filePaths: readonly string[]): Promise<void>;
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
  getDeleteSettings?(): { confirmDelete: boolean; useTrash: boolean };
  disableDeleteConfirmation?(): PromiseLike<void>;
  showWarningMessage(
    message: string,
    options: vscode.MessageOptions,
    ...actions: string[]
  ): Thenable<'Delete' | 'Do not ask me again' | undefined>;
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
  getDeleteSettings: () => ({
    confirmDelete: vscode.workspace.getConfiguration('explorer').get('confirmDelete', true),
    useTrash: vscode.workspace.getConfiguration('files').get('enableTrash', true),
  }),
  disableDeleteConfirmation: () => vscode.workspace
    .getConfiguration('explorer')
    .update('confirmDelete', false, vscode.ConfigurationTarget.Global),
  showWarningMessage: (message, options, ...actions) =>
    vscode.window.showWarningMessage(message, options, ...actions) as Thenable<
      'Delete' | 'Do not ask me again' | undefined
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
  const executeOptimisticMutation = (
    mutation: Parameters<typeof executeWorkspaceFileMutation>[0],
    workspaceFolderUri: vscode.Uri,
  ): Promise<void> => dependencies.executeWorkspaceFileMutation(mutation, {
    workspaceFolderUri,
    refreshGraph: () => source.refreshChangedFiles(workspaceFileMutationPaths(mutation)),
    sendMessage: message => source._sendMessage(message),
  });
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
    const deleteSettings = dependencies.getDeleteSettings?.() ?? {
      confirmDelete: true,
      useTrash: true,
    };
    await dependencies.deleteFiles(paths, {
      confirmDelete: deleteSettings.confirmDelete,
      disableDeleteConfirmation: () => dependencies.disableDeleteConfirmation?.()
        ?? Promise.resolve(),
      workspaceFolder,
      showWarningMessage: (message, options, ...actions) =>
        dependencies.showWarningMessage(message, options, ...actions) as PromiseLike<
          'Delete' | 'Do not ask me again' | undefined
        >,
      executeDeleteAction: async (nextPaths, workspaceFolderUri, useTrash) => {
        await executeOptimisticMutation(
          { kind: 'delete', paths: nextPaths, useTrash },
          workspaceFolderUri,
        );
      },
      useTrash: deleteSettings.useTrash,
    });
  };

  const _renameFile = async (filePath: string): Promise<void> => {
    await dependencies.renameFile(filePath, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      showInputBox: options => dependencies.showInputBox(options),
      executeRenameAction: async (oldPath, newPath, workspaceFolderUri) => {
        await executeOptimisticMutation(
          { kind: 'rename', oldPath, newPath },
          workspaceFolderUri,
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
        await executeOptimisticMutation(
          { kind: 'create', filePath },
          workspaceFolderUri,
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
