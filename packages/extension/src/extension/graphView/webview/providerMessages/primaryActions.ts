import * as vscode from 'vscode';
import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';

type GraphViewProviderPrimaryActions = Pick<
  GraphViewMessageListenerContext,
  | 'openSelectedNode'
  | 'activateNode'
  | 'previewFileAtCommit'
  | 'openFile'
  | 'revealInExplorer'
  | 'copyToClipboard'
  | 'deleteFiles'
  | 'renameFile'
  | 'createFile'
  | 'toggleFavorites'
  | 'addToExclude'
  | 'analyzeAndSendData'
  | 'getFileInfo'
  | 'undo'
  | 'redo'
  | 'showInformationMessage'
  | 'changeView'
  | 'setDepthLimit'
  | 'indexRepository'
  | 'jumpToCommit'
  | 'resetTimeline'
  | 'sendPhysicsSettings'
  | 'updatePhysicsSetting'
  | 'resetPhysicsSettings'
  | 'persistGroups'
  | 'recomputeGroups'
  | 'sendGroupsUpdated'
  | 'showOpenDialog'
  | 'createDirectory'
  | 'copyFile'
  | 'sendMessage'
  | 'applyViewTransform'
  | 'smartRebuild'
>;

export function createGraphViewProviderMessagePrimaryActions(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderPrimaryActions {
  return {
    openSelectedNode: nodeId => source._openSelectedNode(nodeId),
    activateNode: nodeId => source._activateNode(nodeId),
    previewFileAtCommit: (sha, filePath) => source._previewFileAtCommit(sha, filePath),
    openFile: filePath => source._openFile(filePath),
    revealInExplorer: filePath => source._revealInExplorer(filePath),
    copyToClipboard: text => source._copyToClipboard(text),
    deleteFiles: paths => source._deleteFiles(paths),
    renameFile: filePath => source._renameFile(filePath),
    createFile: directory => source._createFile(directory),
    toggleFavorites: paths => source._toggleFavorites(paths),
    addToExclude: patterns => source._addToExclude(patterns),
    analyzeAndSendData: () => source._analyzeAndSendData(),
    getFileInfo: filePath => source._getFileInfo(filePath),
    undo: () => source.undo(),
    redo: () => source.redo(),
    showInformationMessage: detail => {
      dependencies.window.showInformationMessage(detail);
    },
    changeView: viewId => source.changeView(viewId),
    setDepthLimit: depthLimit => source.setDepthLimit(depthLimit),
    indexRepository: () => source._indexRepository(),
    jumpToCommit: sha => source._jumpToCommit(sha),
    resetTimeline: () => source._resetTimeline(),
    sendPhysicsSettings: () => source._sendPhysicsSettings(),
    updatePhysicsSetting: (key, value) => source._updatePhysicsSetting(key, value),
    resetPhysicsSettings: () => source._resetPhysicsSettings(),
    persistGroups: async groups => {
      const target = dependencies.getConfigTarget(dependencies.workspace.workspaceFolders);
      await dependencies.workspace.getConfiguration('codegraphy').update('groups', groups, target);
    },
    recomputeGroups: () => source._computeMergedGroups(),
    sendGroupsUpdated: () => source._sendGroupsUpdated(),
    showOpenDialog: options => dependencies.window.showOpenDialog(options),
    createDirectory: uri => vscode.workspace.fs.createDirectory(uri),
    copyFile: (sourceUri, destinationUri, options) =>
      vscode.workspace.fs.copy(sourceUri, destinationUri, options),
    sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    applyViewTransform: () => source._applyViewTransform(),
    smartRebuild: (kind, id) => source._smartRebuild(kind, id),
  };
}
