import type * as vscode from 'vscode';
import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from './contracts';

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
  | '_toggleFavorites'
  | '_getFileInfo'
  | '_getVisitCount'
  | '_incrementVisitCount'
  | '_addToExclude'
  | '_indexRepository'
  | '_jumpToCommit'
  | '_openSelectedNode'
  | '_activateNode'
  | '_previewFileAtCommit'
  | '_sendCachedTimeline'
> {
  return {
    _openFile: (filePath, behavior?: EditorOpenBehavior) =>
      owner._fileActionMethods._openFile(filePath, behavior),
    _revealInExplorer: filePath => owner._fileActionMethods._revealInExplorer(filePath),
    _copyToClipboard: text => owner._fileActionMethods._copyToClipboard(text),
    _deleteFiles: paths => owner._fileActionMethods._deleteFiles(paths),
    _renameFile: filePath => owner._fileActionMethods._renameFile(filePath),
    _createFile: directory => owner._fileActionMethods._createFile(directory),
    _toggleFavorites: paths => owner._fileActionMethods._toggleFavorites(paths),
    _getFileInfo: filePath => owner._fileVisitMethods._getFileInfo(filePath),
    _getVisitCount: filePath => owner._fileVisitMethods._getVisitCount(filePath),
    _incrementVisitCount: filePath => owner._fileVisitMethods._incrementVisitCount(filePath),
    _addToExclude: patterns => owner._fileVisitMethods._addToExclude(patterns),
    _indexRepository: () => owner._timelineMethods._indexRepository(),
    _jumpToCommit: sha => owner._timelineMethods._jumpToCommit(sha),
    _openSelectedNode: nodeId => owner._timelineMethods._openSelectedNode(nodeId),
    _activateNode: nodeId => owner._timelineMethods._activateNode(nodeId),
    _previewFileAtCommit: (sha, filePath, behavior?: EditorOpenBehavior) =>
      owner._timelineMethods._previewFileAtCommit(sha, filePath, behavior),
    _sendCachedTimeline: () => owner._timelineMethods._sendCachedTimeline(),
  };
}
