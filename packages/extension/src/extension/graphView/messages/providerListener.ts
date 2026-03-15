import * as vscode from 'vscode';
import type {
  DagMode,
  ExtensionToWebviewMessage,
  IGraphData,
  IGroup,
  IPhysicsSettings,
  NodeSizeMode,
} from '../../../shared/types';
import type { IViewContext } from '../../../core/views';
import { DEFAULT_FOLDER_NODE_COLOR } from '../../../shared/types';
import { getUndoManager } from '../../UndoManager';
import { ResetSettingsAction } from '../../actions';
import { getGraphViewConfigTarget, normalizeFolderNodeColor } from '../../graphViewSettings';
import { captureGraphViewSettingsSnapshot } from '../settings';
import { setGraphViewWebviewMessageListener } from './listener';

interface GraphViewConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown, target: unknown): PromiseLike<void>;
}

interface GraphViewWorkspaceLike {
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;
  getConfiguration(section: string): GraphViewConfigurationLike;
}

interface GraphViewWindowLike {
  showInformationMessage(message: string): void;
  showOpenDialog(
    options: vscode.OpenDialogOptions,
  ): PromiseLike<readonly vscode.Uri[] | undefined>;
}

export interface GraphViewProviderMessageListenerDependencies {
  workspace: GraphViewWorkspaceLike;
  window: GraphViewWindowLike;
  getConfigTarget(
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
  ): unknown;
  captureSettingsSnapshot(
    configuration: GraphViewConfigurationLike,
    physicsSettings: IPhysicsSettings,
    nodeSizeMode: NodeSizeMode,
  ): unknown;
  createResetSettingsAction(
    snapshot: unknown,
    target: unknown,
    context: vscode.ExtensionContext,
    sendAllSettings: () => void,
    setNodeSizeMode: (mode: NodeSizeMode) => void,
    analyzeAndSendData: () => Promise<void>,
  ): unknown;
  executeUndoAction(action: unknown): Promise<void>;
  normalizeFolderNodeColor(folderNodeColor: string): string;
  defaultFolderNodeColor: string;
  dagModeKey: string;
  nodeSizeModeKey: string;
}

export interface GraphViewProviderMessageListenerSource {
  _timelineActive: boolean;
  _currentCommitSha: string | undefined;
  _userGroups: IGroup[];
  _activeViewId: string;
  _disabledPlugins: Set<string>;
  _disabledRules: Set<string>;
  _filterPatterns: string[];
  _graphData: IGraphData;
  _viewContext: IViewContext;
  _dagMode: DagMode;
  _nodeSizeMode: NodeSizeMode;
  _firstAnalysis: boolean;
  _webviewReadyNotified: boolean;
  _hiddenPluginGroupIds: Set<string>;
  _context: vscode.ExtensionContext;
  _analyzer?:
    | {
        getPluginFilterPatterns(): string[];
        registry?: {
          notifyWebviewReady(): void;
          getPluginAPI(
            pluginId: string,
          ):
            | { deliverWebviewMessage(message: { type: string; data: unknown }): void }
            | { contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }> }
            | undefined;
        };
      }
    | undefined;
  _eventBus: {
    emit(event: string, payload: unknown): void;
  };
  _firstWorkspaceReadyPromise: Promise<void>;
  _getPhysicsSettings(): IPhysicsSettings;
  _openSelectedNode(nodeId: string): Promise<void>;
  _activateNode(nodeId: string): Promise<void>;
  _previewFileAtCommit(sha: string, filePath: string): Promise<void>;
  _openFile(filePath: string): Promise<void>;
  _revealInExplorer(filePath: string): Promise<void>;
  _copyToClipboard(text: string): Promise<void>;
  _deleteFiles(paths: string[]): Promise<void>;
  _renameFile(filePath: string): Promise<void>;
  _createFile(directory: string): Promise<void>;
  _toggleFavorites(paths: string[]): Promise<void>;
  _addToExclude(patterns: string[]): Promise<void>;
  _analyzeAndSendData(): Promise<void>;
  _getFileInfo(filePath: string): Promise<void>;
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  changeView(viewId: string): Promise<void>;
  setDepthLimit(depthLimit: number): Promise<void>;
  _indexRepository(): Promise<void>;
  _jumpToCommit(sha: string): Promise<void>;
  _sendPhysicsSettings(): void;
  _updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  _resetPhysicsSettings(): Promise<void>;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _applyViewTransform(): void;
  _smartRebuild(kind: 'rule' | 'plugin', id: string): void;
  _sendAllSettings(): void;
  _loadGroupsAndFilterPatterns(): void;
  _loadDisabledRulesAndPlugins(): boolean;
  _sendFavorites(): void;
  _sendSettings(): void;
  _sendCachedTimeline(): void;
  _sendDecorations(): void;
  _sendContextMenuItems(): void;
  _sendPluginWebviewInjections(): void;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderMessageListenerDependencies = {
  workspace: vscode.workspace,
  window: vscode.window,
  getConfigTarget: workspaceFolders => getGraphViewConfigTarget(workspaceFolders),
  captureSettingsSnapshot: (configuration, physicsSettings, nodeSizeMode) =>
    captureGraphViewSettingsSnapshot(configuration as never, physicsSettings, nodeSizeMode),
  createResetSettingsAction: (
    snapshot,
    target,
    context,
    sendAllSettings,
    setNodeSizeMode,
    analyzeAndSendData,
  ) =>
    new ResetSettingsAction(
      snapshot as never,
      target as never,
      context,
      sendAllSettings,
      setNodeSizeMode,
      analyzeAndSendData,
    ),
  executeUndoAction: action => getUndoManager().execute(action as never),
  normalizeFolderNodeColor,
  defaultFolderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
  dagModeKey: 'codegraphy.dagMode',
  nodeSizeModeKey: 'codegraphy.nodeSizeMode',
};

export function setGraphViewProviderMessageListener(
  webview: vscode.Webview,
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies = DEFAULT_DEPENDENCIES,
): void {
  const config = dependencies.workspace.getConfiguration('codegraphy');

  setGraphViewWebviewMessageListener(webview, {
    getTimelineActive: () => source._timelineActive,
    getCurrentCommitSha: () => source._currentCommitSha,
    getUserGroups: () => source._userGroups,
    getActiveViewId: () => source._activeViewId,
    getDisabledPlugins: () => source._disabledPlugins,
    getDisabledRules: () => source._disabledRules,
    getFilterPatterns: () => source._filterPatterns,
    getGraphData: () => source._graphData,
    getViewContext: () => source._viewContext,
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
    updateDagMode: async dagMode => {
      source._dagMode = dagMode;
      await source._context.workspaceState.update(dependencies.dagModeKey, source._dagMode);
      source._sendMessage({ type: 'DAG_MODE_UPDATED', payload: { dagMode: source._dagMode } });
    },
    updateNodeSizeMode: async nodeSizeMode => {
      source._nodeSizeMode = nodeSizeMode;
      await source._context.workspaceState.update(
        dependencies.nodeSizeModeKey,
        source._nodeSizeMode,
      );
      source._sendMessage({
        type: 'NODE_SIZE_MODE_UPDATED',
        payload: { nodeSizeMode: source._nodeSizeMode },
      });
    },
    indexRepository: () => source._indexRepository(),
    jumpToCommit: sha => source._jumpToCommit(sha),
    sendPhysicsSettings: () => source._sendPhysicsSettings(),
    updatePhysicsSetting: (key, value) => source._updatePhysicsSetting(key, value),
    resetPhysicsSettings: () => source._resetPhysicsSettings(),
    workspaceFolder: dependencies.workspace.workspaceFolders?.[0],
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
    getConfig: (key, defaultValue) =>
      dependencies.workspace.getConfiguration('codegraphy').get(key, defaultValue),
    updateConfig: async (key, value) => {
      const target = dependencies.getConfigTarget(dependencies.workspace.workspaceFolders);
      await dependencies.workspace.getConfiguration('codegraphy').update(key, value, target);
    },
    getPluginFilterPatterns: () => source._analyzer?.getPluginFilterPatterns() ?? [],
    sendMessage: nextMessage => source._sendMessage(nextMessage as ExtensionToWebviewMessage),
    applyViewTransform: () => source._applyViewTransform(),
    smartRebuild: (kind, id) => source._smartRebuild(kind, id),
    resetAllSettings: async () => {
      const snapshot = dependencies.captureSettingsSnapshot(
        dependencies.workspace.getConfiguration('codegraphy'),
        source._getPhysicsSettings(),
        source._nodeSizeMode,
      );
      const action = dependencies.createResetSettingsAction(
        snapshot,
        dependencies.getConfigTarget(dependencies.workspace.workspaceFolders),
        source._context,
        () => source._sendAllSettings(),
        mode => {
          source._nodeSizeMode = mode;
        },
        () => source._analyzeAndSendData(),
      );
      await dependencies.executeUndoAction(action);
    },
    getMaxFiles: () => config.get<number>('maxFiles', 500),
    getPlaybackSpeed: () => config.get<number>('timeline.playbackSpeed', 1.0),
    getDagMode: () => source._dagMode,
    getNodeSizeMode: () => source._nodeSizeMode,
    getFolderNodeColor: () =>
      dependencies.normalizeFolderNodeColor(
        config.get<string>('folderNodeColor', dependencies.defaultFolderNodeColor),
      ),
    hasWorkspace: () => (dependencies.workspace.workspaceFolders?.length ?? 0) > 0,
    isFirstAnalysis: () => source._firstAnalysis,
    isWebviewReadyNotified: () => source._webviewReadyNotified,
    getHiddenPluginGroupIds: () => source._hiddenPluginGroupIds,
    loadGroupsAndFilterPatterns: () => source._loadGroupsAndFilterPatterns(),
    loadDisabledRulesAndPlugins: () => source._loadDisabledRulesAndPlugins(),
    sendFavorites: () => source._sendFavorites(),
    sendSettings: () => source._sendSettings(),
    sendCachedTimeline: () => source._sendCachedTimeline(),
    sendDecorations: () => source._sendDecorations(),
    sendContextMenuItems: () => source._sendContextMenuItems(),
    sendPluginWebviewInjections: () => source._sendPluginWebviewInjections(),
    waitForFirstWorkspaceReady: () => source._firstWorkspaceReadyPromise,
    notifyWebviewReady: () => source._analyzer?.registry?.notifyWebviewReady(),
    getInteractionPluginApi: pluginId =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | { deliverWebviewMessage(message: { type: string; data: unknown }): void }
        | undefined,
    getContextMenuPluginApi: pluginId =>
      source._analyzer?.registry?.getPluginAPI(pluginId) as
        | { contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }> }
        | undefined,
    emitEvent: (event, payload) => {
      source._eventBus.emit(event, payload);
    },
    findNode: targetId => source._graphData.nodes.find(node => node.id === targetId),
    findEdge: targetId => source._graphData.edges.find(edge => edge.id === targetId),
    logError: (label, error) => {
      console.error(label, error);
    },
    updateHiddenPluginGroups: groupIds => {
      const target = dependencies.getConfigTarget(dependencies.workspace.workspaceFolders);
      return Promise.resolve(
        dependencies.workspace.getConfiguration('codegraphy').update(
          'hiddenPluginGroups',
          groupIds,
          target,
        ),
      );
    },
    setUserGroups: groups => {
      source._userGroups = groups;
    },
    setFilterPatterns: patterns => {
      source._filterPatterns = patterns;
    },
    setWebviewReadyNotified: readyNotified => {
      source._webviewReadyNotified = readyNotified;
    },
  });
}
