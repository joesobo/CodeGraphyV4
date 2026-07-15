import {
  type GraphViewProviderFileNavigationSource,
} from './navigation';
import type {
  EditorOpenBehavior,
  GraphViewProviderFileActionMethodDependencies,
  GraphViewProviderFileActionMethods,
  GraphViewProviderFileActionMethodsSource,
} from './contracts';
import { DEFAULT_GRAPH_VIEW_FILE_ACTION_DEPENDENCIES } from './dependencies';

export type {
  GraphViewProviderFileActionMethodDependencies,
  GraphViewProviderFileActionMethods,
  GraphViewProviderFileActionMethodsSource,
} from './contracts';

export function createGraphViewProviderFileActionMethods(
  source: GraphViewProviderFileActionMethodsSource,
  dependencies: GraphViewProviderFileActionMethodDependencies = DEFAULT_GRAPH_VIEW_FILE_ACTION_DEPENDENCIES,
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

  const _createFile = async (directory: string): Promise<string | void> => {
    return dependencies.createFile(directory, {
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

  const _openSelectedNode = (nodeId: string): Promise<void> =>
    _openFile(nodeId, { preview: true, preserveFocus: false });

  const _activateNode = (nodeId: string): Promise<void> =>
    _openFile(nodeId, { preview: false, preserveFocus: false });

  return {
    _openSelectedNode,
    _activateNode,
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
