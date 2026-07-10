import type * as vscode from 'vscode';
import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from '../contracts';

type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

export function createGraphViewProviderFileMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  | '_openFile'
  | '_openSelectedNode'
  | '_activateNode'
  | '_revealInExplorer'
  | '_copyToClipboard'
  | '_deleteFiles'
  | '_renameFile'
  | '_createFile'
  | '_createFolder'
  | '_toggleFavorites'
  | '_setFocusedFile'
  | '_getFocusedFile'
  | '_getFileInfo'
  | '_addToExclude'
> {
  return {
    _openFile: (filePath, behavior?: EditorOpenBehavior) =>
      owner._methodContainers.fileAction._openFile(filePath, behavior),
    _openSelectedNode: nodeId => owner._methodContainers.fileAction._openSelectedNode(nodeId),
    _activateNode: nodeId => owner._methodContainers.fileAction._activateNode(nodeId),
    _revealInExplorer: filePath => owner._methodContainers.fileAction._revealInExplorer(filePath),
    _copyToClipboard: text => owner._methodContainers.fileAction._copyToClipboard(text),
    _deleteFiles: paths => owner._methodContainers.fileAction._deleteFiles(paths),
    _renameFile: filePath => owner._methodContainers.fileAction._renameFile(filePath),
    _createFile: directory => owner._methodContainers.fileAction._createFile(directory),
    _createFolder: directory => owner._methodContainers.fileAction._createFolder(directory),
    _toggleFavorites: paths => owner._methodContainers.fileAction._toggleFavorites(paths),
    _setFocusedFile: filePath => owner._methodContainers.viewSelection.setFocusedFile(filePath),
    _getFocusedFile: () => owner._viewContext.focusedFile,
    _getFileInfo: filePath => owner._methodContainers.fileInfo._getFileInfo(filePath),
    _addToExclude: patterns => owner._methodContainers.fileInfo._addToExclude(patterns),
  };
}
