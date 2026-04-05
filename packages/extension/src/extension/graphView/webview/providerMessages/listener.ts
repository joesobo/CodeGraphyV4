import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { ISettingsSnapshot } from '../../../../shared/settings/snapshot';
import type { IViewContext } from '../../../../core/views/contracts';
import { DEFAULT_FOLDER_NODE_COLOR } from '../../../../shared/fileColors';
import { getUndoManager } from '../../../undoManager';
import type { IUndoableAction } from '../../../undoManager';
import { ResetSettingsAction } from '../../../actions/resetSettings';
import { getGraphViewConfigTarget, normalizeFolderNodeColor } from '../../settings/reader';
import { captureGraphViewSettingsSnapshot } from '../../settings/snapshotMessages';
import { createGraphViewProviderMessagePluginContext } from './pluginContext';
import { createGraphViewProviderMessagePrimaryActions } from './primaryActions';
import { createGraphViewProviderMessageReadContext } from './readContext';
import { createGraphViewProviderMessageSettingsContext } from './settingsContext';
import { dispatchGraphViewPluginMessage } from '../dispatch/plugin';
import { dispatchGraphViewPrimaryMessage } from '../dispatch/primary';
import { setGraphViewWebviewMessageListener } from '../messages/listener';

interface GraphViewConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown, target: vscode.ConfigurationTarget): PromiseLike<void>;
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
  ): vscode.ConfigurationTarget;
  captureSettingsSnapshot(
    configuration: GraphViewConfigurationLike,
    physicsSettings: IPhysicsSettings,
    nodeSizeMode: NodeSizeMode,
  ): ISettingsSnapshot;
  createResetSettingsAction(
    snapshot: ISettingsSnapshot,
    target: vscode.ConfigurationTarget,
    context: vscode.ExtensionContext,
    sendAllSettings: () => void,
    setNodeSizeMode: (mode: NodeSizeMode) => void,
    analyzeAndSendData: () => Promise<void>,
  ): IUndoableAction;
  executeUndoAction(action: IUndoableAction): Promise<void>;
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
  _disabledSources: Set<string>;
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
  setFocusedFile(filePath: string | undefined): void;
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
  _resetTimeline(): Promise<void>;
  _sendPhysicsSettings(): void;
  _updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  _resetPhysicsSettings(): Promise<void>;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _sendAvailableViews(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _applyViewTransform(): void;
  _smartRebuild(kind: 'rule' | 'plugin', id: string): void;
  _sendAllSettings(): void;
  _loadGroupsAndFilterPatterns(): void;
  _loadDisabledRulesAndPlugins(): boolean;
  _sendFavorites(): void;
  _sendSettings(): void;
  _sendCachedTimeline(): Promise<void>;
  _sendDecorations(): void;
  _sendContextMenuItems(): void;
  _sendPluginWebviewInjections(): void;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderMessageListenerDependencies = {
  workspace: vscode.workspace,
  window: vscode.window,
  getConfigTarget: workspaceFolders => getGraphViewConfigTarget(workspaceFolders),
  captureSettingsSnapshot: (configuration, physicsSettings, nodeSizeMode) =>
    captureGraphViewSettingsSnapshot(configuration, physicsSettings, nodeSizeMode),
  createResetSettingsAction: (
    snapshot,
    target,
    context,
    sendAllSettings,
    setNodeSizeMode,
    analyzeAndSendData,
  ) =>
    new ResetSettingsAction(
      snapshot,
      target,
      context,
      sendAllSettings,
      setNodeSizeMode,
      analyzeAndSendData,
    ),
  executeUndoAction: action => getUndoManager().execute(action),
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

export async function dispatchGraphViewProviderMessage(
  message: WebviewToExtensionMessage,
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const context = {
    ...createGraphViewProviderMessageReadContext(source, dependencies),
    ...createGraphViewProviderMessagePrimaryActions(source, dependencies),
    ...createGraphViewProviderMessageSettingsContext(source, dependencies),
    ...createGraphViewProviderMessagePluginContext(source, dependencies),
  };

  const primaryResult = await dispatchGraphViewPrimaryMessage(message, context);
  if (primaryResult.handled) {
    if (primaryResult.userGroups !== undefined) {
      context.setUserGroups(primaryResult.userGroups);
      context.recomputeGroups();
      context.sendGroupsUpdated();
    }
    if (primaryResult.filterPatterns !== undefined) {
      context.setFilterPatterns(primaryResult.filterPatterns);
    }
    return;
  }

  const pluginResult = await dispatchGraphViewPluginMessage(message, context);
  if (pluginResult.handled && pluginResult.readyNotified !== undefined) {
    context.setWebviewReadyNotified(pluginResult.readyNotified);
  }
}
