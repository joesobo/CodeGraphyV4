import * as vscode from 'vscode';
import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import {
  getCodeGraphyConfiguration,
  updateCodeGraphyConfigurationSilently,
} from '../../../repoSettings/current';

type GraphViewProviderPrimaryActions = Pick<
  GraphViewMessageListenerContext,
  | 'openSelectedNode'
  | 'activateNode'
  | 'canOpenPath'
  | 'setFocusedFile'
  | 'previewFileAtCommit'
  | 'openFile'
  | 'openInEditor'
  | 'revealInExplorer'
  | 'copyToClipboard'
  | 'deleteFiles'
  | 'renameFile'
  | 'createFile'
  | 'toggleFavorites'
  | 'addToExclude'
  | 'loadAndSendData'
  | 'indexAndSendData'
  | 'analyzeAndSendData'
  | 'refreshIndex'
  | 'clearCacheAndRefresh'
  | 'getFileInfo'
  | 'undo'
  | 'redo'
  | 'showInformationMessage'
  | 'setDepthMode'
  | 'setDepthLimit'
  | 'indexRepository'
  | 'jumpToCommit'
  | 'resetTimeline'
  | 'sendPhysicsSettings'
  | 'updatePhysicsSetting'
  | 'resetPhysicsSettings'
  | 'persistLegends'
  | 'persistDefaultLegendVisibility'
  | 'persistDefaultLegendVisibilityBatch'
  | 'persistLegendOrder'
  | 'recomputeGroups'
  | 'sendGroupsUpdated'
  | 'showOpenDialog'
  | 'createDirectory'
  | 'writeFile'
  | 'copyFile'
  | 'sendMessage'
  | 'applyViewTransform'
  | 'smartRebuild'
>;

export function createGraphViewProviderMessagePrimaryActions(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderPrimaryActions {
  const canOpenPath = (filePath: string): boolean => canOpenGraphPath(source, filePath);

  return {
    openSelectedNode: nodeId => source._openSelectedNode(nodeId),
    activateNode: nodeId => source._activateNode(nodeId),
    setFocusedFile: filePath => source.setFocusedFile(filePath),
    previewFileAtCommit: (sha, filePath) => source._previewFileAtCommit(sha, filePath),
    openFile: filePath => source._openFile(filePath),
    canOpenPath,
    openInEditor: () => source._webviewMethods.openInEditor(),
    revealInExplorer: filePath => source._revealInExplorer(filePath),
    copyToClipboard: text => source._copyToClipboard(text),
    deleteFiles: paths => source._deleteFiles(paths),
    renameFile: filePath => source._renameFile(filePath),
    createFile: directory => source._createFile(directory),
    toggleFavorites: paths => source._toggleFavorites(paths),
    addToExclude: patterns => source._addToExclude(patterns),
    loadAndSendData: () => source._loadAndSendData(),
    indexAndSendData: () => source._indexAndSendData(),
    analyzeAndSendData: () => source._analyzeAndSendData(),
    refreshIndex: () => source.refreshIndex(),
    clearCacheAndRefresh: () => source.clearCacheAndRefresh(),
    getFileInfo: filePath => source._getFileInfo(filePath),
    undo: () => source.undo(),
    redo: () => source.redo(),
    showInformationMessage: detail => {
      dependencies.window.showInformationMessage(detail);
    },
    setDepthMode: depthMode => source.setDepthMode(depthMode),
    setDepthLimit: depthLimit => source.setDepthLimit(depthLimit),
    indexRepository: () => source._indexRepository(),
    jumpToCommit: sha => source._jumpToCommit(sha),
    resetTimeline: () => source._resetTimeline(),
    sendPhysicsSettings: () => source._sendPhysicsSettings(),
    updatePhysicsSetting: (key, value) => source._updatePhysicsSetting(key, value),
    resetPhysicsSettings: () => source._resetPhysicsSettings(),
    persistLegends: async legends => {
      await updateCodeGraphyConfigurationSilently('legend', legends);
    },
    persistDefaultLegendVisibility: async (legendId, visible) => {
      const currentVisibility =
        getCodeGraphyConfiguration().get<Record<string, boolean>>('legendVisibility', {}) ?? {};
      await updateCodeGraphyConfigurationSilently('legendVisibility', {
        ...currentVisibility,
        [legendId]: visible,
      });
    },
    persistDefaultLegendVisibilityBatch: async (legendVisibility: Record<string, boolean>) => {
      const currentVisibility =
        getCodeGraphyConfiguration().get<Record<string, boolean>>('legendVisibility', {}) ?? {};
      await updateCodeGraphyConfigurationSilently('legendVisibility', {
        ...currentVisibility,
        ...legendVisibility,
      });
    },
    persistLegendOrder: async legendIds => {
      await updateCodeGraphyConfigurationSilently('legendOrder', legendIds);
    },
    recomputeGroups: () => source._computeMergedGroups(),
    sendGroupsUpdated: () => source._sendGroupsUpdated(),
    showOpenDialog: options => dependencies.window.showOpenDialog(options),
    createDirectory: uri => vscode.workspace.fs.createDirectory(uri),
    writeFile: (uri, content) => vscode.workspace.fs.writeFile(uri, content),
    copyFile: (sourceUri, destinationUri, options) =>
      vscode.workspace.fs.copy(sourceUri, destinationUri, options),
    sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    applyViewTransform: () => source._applyViewTransform(),
    smartRebuild: id => source._smartRebuild(id),
  };
}

function canOpenGraphPath(
  source: GraphViewProviderMessageListenerSource,
  filePath: string,
): boolean {
  const node = source._graphData.nodes.find((graphNode) => graphNode.id === filePath);
  if (node) {
    return canOpenGraphNode(node.nodeType);
  }

  return !filePath.startsWith('pkg:') && !isInferredFolderPath(source, filePath);
}

function canOpenGraphNode(nodeType: string | undefined): boolean {
  return nodeType !== 'folder' && nodeType !== 'package';
}

function isInferredFolderPath(
  source: GraphViewProviderMessageListenerSource,
  filePath: string,
): boolean {
  return filePath === '(root)'
    ? source._graphData.nodes.some(isRootLevelFileNode)
    : source._graphData.nodes.some((graphNode) => isNestedFileNode(graphNode, filePath));
}

function isRootLevelFileNode(
  graphNode: GraphViewProviderMessageListenerSource['_graphData']['nodes'][number],
): boolean {
  return isGraphFileNode(graphNode) && !graphNode.id.includes('/');
}

function isNestedFileNode(
  graphNode: GraphViewProviderMessageListenerSource['_graphData']['nodes'][number],
  filePath: string,
): boolean {
  return isGraphFileNode(graphNode) && graphNode.id.startsWith(`${filePath}/`);
}

function isGraphFileNode(
  graphNode: GraphViewProviderMessageListenerSource['_graphData']['nodes'][number],
): boolean {
  return graphNode.nodeType !== 'folder'
    && graphNode.nodeType !== 'package'
    && !graphNode.id.startsWith('pkg:');
}
