import type * as vscode from 'vscode';
import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from '../contracts';

type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

export function createGraphViewProviderFileTimelineMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  | '_openFile'
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
  | '_indexRepository'
  | '_jumpToCommit'
  | '_resetTimeline'
  | '_invalidateTimelineCache'
  | '_openSelectedNode'
  | '_activateNode'
  | '_previewFileAtCommit'
  | '_sendCachedTimeline'
> {
  return {
    _openFile: (filePath, behavior?: EditorOpenBehavior) =>
      owner._methodContainers.fileAction._openFile(filePath, behavior),
    _revealInExplorer: filePath => owner._methodContainers.fileAction._revealInExplorer(filePath),
    _copyToClipboard: text => owner._methodContainers.fileAction._copyToClipboard(text),
    _deleteFiles: paths => owner._methodContainers.fileAction._deleteFiles(paths),
    _renameFile: (filePath, newName) => owner._methodContainers.fileAction._renameFile(filePath, newName),
    _createFile: (directory, name) => owner._methodContainers.fileAction._createFile(directory, name),
    _createFolder: (directory, name) => owner._methodContainers.fileAction._createFolder(directory, name),
    _toggleFavorites: paths => owner._methodContainers.fileAction._toggleFavorites(paths),
    _setFocusedFile: filePath => owner._methodContainers.viewSelection.setFocusedFile(filePath),
    _getFocusedFile: () => owner._viewContext.focusedFile,
    _getFileInfo: filePath => owner._methodContainers.fileInfo._getFileInfo(filePath),
    _addToExclude: patterns => owner._methodContainers.fileInfo._addToExclude(patterns),
    _indexRepository: () => owner._methodContainers.timeline._indexRepository(),
    _jumpToCommit: sha => owner._methodContainers.timeline._jumpToCommit(sha),
    _resetTimeline: () => owner._methodContainers.timeline._resetTimeline(),
    _invalidateTimelineCache: () => owner._methodContainers.timeline.invalidateTimelineCache(),
    _openSelectedNode: nodeId => owner._methodContainers.timeline._openSelectedNode(nodeId),
    _activateNode: nodeId => owner._methodContainers.timeline._activateNode(nodeId),
    _previewFileAtCommit: (sha, filePath, behavior?: EditorOpenBehavior) =>
      owner._methodContainers.timeline._previewFileAtCommit(sha, filePath, behavior),
    _sendCachedTimeline: () => owner._methodContainers.timeline._sendCachedTimeline(),
  };
}
