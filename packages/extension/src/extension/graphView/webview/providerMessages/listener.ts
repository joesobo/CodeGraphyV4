import * as vscode from 'vscode';
import type { IFileAnalysisResult } from '../../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { ISettingsSnapshot } from '../../../../shared/settings/snapshot';
import type { IViewContext } from '../../../../core/views/contracts';
import { getUndoManager } from '../../../undoManager';
import type { IUndoableAction } from '../../../undoManager';
import { ResetSettingsAction } from '../../../actions/resetSettings';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../../pipeline/database/cache/storage';
import { getGraphViewConfigTarget } from '../../settings/reader';
import { captureGraphViewSettingsSnapshot } from '../../settings/snapshot';
import { createGraphViewProviderMessageContext } from './context';
import { setGraphViewWebviewMessageListener } from '../messages/listener';

interface GraphViewConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
  update(
    key: string,
    value: unknown,
    target?: vscode.ConfigurationTarget,
  ): PromiseLike<void>;
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
    target: vscode.ConfigurationTarget | undefined,
    context: vscode.ExtensionContext,
    sendAllSettings: () => void,
    setNodeSizeMode: (mode: NodeSizeMode) => void,
    analyzeAndSendData: () => Promise<void>,
  ): IUndoableAction;
  executeUndoAction(action: IUndoableAction): Promise<void>;
  dagModeKey: string;
  nodeSizeModeKey: string;
}

export interface GraphViewProviderMessageListenerSource {
  _timelineActive: boolean;
  _currentCommitSha: string | undefined;
  _userGroups: IGroup[];
  _disabledPlugins: Set<string>;
  _filterPatterns: string[];
  _graphData: IGraphData;
  _viewContext: IViewContext;
  _depthMode: boolean;
  _dagMode: DagMode;
  _nodeSizeMode: NodeSizeMode;
  _firstAnalysis: boolean;
  _webviewReadyNotified: boolean;
  _webviewMethods: {
    openInEditor(): void;
  };
  _context: vscode.ExtensionContext;
  _analyzer?:
    | {
        getPluginFilterPatterns(): string[];
        lastFileAnalysis: ReadonlyMap<string, IFileAnalysisResult>;
        readStructuredAnalysisSnapshot?(): WorkspaceAnalysisDatabaseSnapshot;
        registry?: {
          notifyWebviewReady(): void;
          getPluginAPI(
            pluginId: string,
          ):
            | { deliverWebviewMessage(message: { type: string; data: unknown }): void }
            | { contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }> }
            | { exporters: ReadonlyArray<{ run(): Promise<void> | void }> }
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
  _loadAndSendData(): Promise<void>;
  _indexAndSendData(): Promise<void>;
  _analyzeAndSendData(): Promise<void>;
  refreshIndex(): Promise<void>;
  refreshChangedFiles(filePaths: readonly string[]): Promise<void>;
  clearCacheAndRefresh(): Promise<void>;
  _getFileInfo(filePath: string): Promise<void>;
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  setDepthMode(depthMode: boolean): Promise<void>;
  setDepthLimit(depthLimit: number): Promise<void>;
  _indexRepository(): Promise<void>;
  _jumpToCommit(sha: string): Promise<void>;
  _resetTimeline(): Promise<void>;
  _sendPhysicsSettings(): void;
  _updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  _resetPhysicsSettings(): Promise<void>;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _sendDepthState(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _applyViewTransform(): void;
  _smartRebuild(id: string): void;
  _sendAllSettings(): void;
  _loadGroupsAndFilterPatterns(): void;
  _loadDisabledRulesAndPlugins(): boolean;
  _sendFavorites(): void;
  _sendSettings(): void;
  _sendCachedTimeline(): Promise<void>;
  _sendDecorations(): void;
  _sendContextMenuItems(): void;
  _sendPluginExporters?(): void;
  _sendPluginToolbarActions?(): void;
  _sendPluginWebviewInjections(): void;
  _sendGraphControls?(): void;
  invalidatePluginFiles(pluginIds: readonly string[]): string[];
}

export const DEFAULT_DEPENDENCIES: GraphViewProviderMessageListenerDependencies = {
  workspace: {
    get workspaceFolders() {
      return vscode.workspace.workspaceFolders;
    },
    getConfiguration: section =>
      section === 'codegraphy'
        ? getCodeGraphyConfiguration()
        : vscode.workspace.getConfiguration(section),
  },
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
  dagModeKey: 'dagMode',
  nodeSizeModeKey: 'nodeSizeMode',
};

export function setGraphViewProviderMessageListener(
  webview: vscode.Webview,
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies = DEFAULT_DEPENDENCIES,
): void {
  setGraphViewWebviewMessageListener(
    webview,
    createGraphViewProviderMessageContext(source, dependencies),
  );
}
