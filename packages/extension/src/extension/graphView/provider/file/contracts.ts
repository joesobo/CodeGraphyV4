import type * as vscode from 'vscode';
import type { IUndoableAction } from '../../../undoManager';

export type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

export interface GraphViewProviderFileActionMethodsSource {
  _getFocusedFile(): string | undefined;
  _analyzeAndSendData(): Promise<void>;
  _sendFavorites(favorites?: string[]): void;
  _setFocusedFile(filePath: string | undefined): void;
}

export interface GraphViewProviderFileActionMethods {
  _openSelectedNode(nodeId: string): Promise<void>;
  _activateNode(nodeId: string): Promise<void>;
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
  openFile: typeof import('./navigation').openGraphViewProviderFile;
  revealFile: typeof import('./navigation').revealGraphViewProviderFileInExplorer;
  copyText: typeof import('./navigation').copyGraphViewProviderTextToClipboard;
  deleteFiles: typeof import('../../files/actions').deleteGraphViewFiles;
  renameFile: typeof import('../../files/rename').renameGraphViewFile;
  createFile: typeof import('../../files/actions').createGraphViewFile;
  createFolder: typeof import('../../files/actions').createGraphViewFolder;
  toggleFavorites: typeof import('../../favorites').toggleGraphViewFavorites;
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
  createCreateFolderAction(
    folderPath: string,
    workspaceFolderUri: vscode.Uri,
    analyzeAndSendData: () => Promise<void>,
  ): IUndoableAction;
  createToggleFavoriteAction(
    paths: string[],
    sendFavorites: (favorites: string[]) => void,
  ): IUndoableAction;
  executeUndoAction(action: IUndoableAction): Promise<void>;
}
