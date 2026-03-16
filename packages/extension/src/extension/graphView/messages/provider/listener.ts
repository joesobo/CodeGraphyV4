import * as vscode from 'vscode';
import type {
  DagMode,
  ExtensionToWebviewMessage,
  IGraphData,
  IGroup,
  IPhysicsSettings,
  NodeSizeMode,
} from '../../../../shared/types';
import type { IViewContext } from '../../../../core/views';
import { DEFAULT_FOLDER_NODE_COLOR } from '../../../../shared/types';
import { getUndoManager } from '../../../UndoManager';
import { ResetSettingsAction } from '../../../actions';
import { getGraphViewConfigTarget, normalizeFolderNodeColor } from '../../settings/config';
import { captureGraphViewSettingsSnapshot } from '../../settings';
import { createGraphViewProviderMessagePluginContext } from './pluginContext';
import { createGraphViewProviderMessagePrimaryActions } from './primaryActions';
import { createGraphViewProviderMessageReadContext } from './readContext';
import { createGraphViewProviderMessageSettingsContext } from './settingsContext';
import { setGraphViewWebviewMessageListener } from '../webviewListener';

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
  setGraphViewWebviewMessageListener(webview, {
    ...createGraphViewProviderMessageReadContext(source, dependencies),
    ...createGraphViewProviderMessagePrimaryActions(source, dependencies),
    ...createGraphViewProviderMessageSettingsContext(source, dependencies),
    ...createGraphViewProviderMessagePluginContext(source, dependencies),
  });
}
