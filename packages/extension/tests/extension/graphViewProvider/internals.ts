import type { IGraphData } from '../../../src/shared/graph/types';
import type { GraphViewProvider } from '../../../src/extension/graphViewProvider';

export interface GraphViewProviderInternals {
  _analysisMethods: {
    _analyzeAndSendData(): Promise<void>;
    _doAnalyzeAndSendData(signal: AbortSignal, requestId: number): Promise<void>;
    _markWorkspaceReady(graph: IGraphData): void;
    _isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
    _isAbortError(error: unknown): boolean;
  };
  _fileActionMethods: {
    _openFile(filePath: string, behavior?: unknown): Promise<void>;
    _revealInExplorer(filePath: string): Promise<void>;
    _copyToClipboard(text: string): Promise<void>;
    _deleteFiles(paths: string[]): Promise<void>;
    _renameFile(filePath: string): Promise<void>;
    _createFile(directory: string): Promise<void>;
    _toggleFavorites(paths: string[]): Promise<void>;
  };
  _fileVisitMethods: {
    _getFileInfo(filePath: string): Promise<void>;
    _getVisitCount(filePath: string): number;
    _incrementVisitCount(filePath: string): Promise<void>;
    _addToExclude(patterns: string[]): Promise<void>;
    _sendFavorites(): void;
    trackFileVisit(filePath: string): Promise<void>;
  };
  _physicsSettingsMethods: {
    _getPhysicsSettings(): unknown;
    _sendPhysicsSettings(): void;
    _updatePhysicsSetting(key: string, value: number): Promise<void>;
    _resetPhysicsSettings(): Promise<void>;
  };
  _pluginMethods: {
    _sendAvailableViews(): void;
    _sendPluginStatuses(): void;
    _sendDecorations(): void;
    _sendContextMenuItems(): void;
    _sendPluginWebviewInjections(): void;
    _sendGroupsUpdated(): void;
    registerExternalPlugin(plugin: unknown, options?: unknown): void;
  };
  _pluginResourceMethods: {
    _registerBuiltInPluginRoots(): void;
    _getPluginDefaultGroups(): unknown[];
    _getBuiltInDefaultGroups(): unknown[];
    _computeMergedGroups(): void;
    _resolveWebviewAssetPath(assetPath: string, pluginId?: string): string;
    _getLocalResourceRoots(): unknown[];
    _refreshWebviewResourceRoots(): void;
    _normalizeExternalExtensionUri(uri: unknown): unknown;
  };
  _refreshMethods: {
    refresh(): Promise<void>;
    refreshPhysicsSettings(): void;
    refreshSettings(): void;
    refreshToggleSettings(): void;
    clearCacheAndRefresh(): Promise<void>;
    _rebuildAndSend(): void;
    _smartRebuild(kind: 'rule' | 'plugin', id: string): void;
  };
  _settingsStateMethods: {
    _loadGroupsAndFilterPatterns(): void;
    _loadDisabledRulesAndPlugins(): boolean;
    _sendSettings(): void;
    _sendAllSettings(): void;
  };
  _timelineMethods: {
    _indexRepository(): Promise<void>;
    _jumpToCommit(sha: string): Promise<void>;
    _openSelectedNode(nodeId: string): Promise<void>;
    _activateNode(nodeId: string): Promise<void>;
    _openNodeInEditor(nodeId: string, behavior: unknown): Promise<void>;
    _previewFileAtCommit(sha: string, filePath: string, behavior?: unknown): Promise<void>;
    _sendCachedTimeline(): void;
    sendPlaybackSpeed(): void;
    invalidateTimelineCache(): Promise<void>;
  };
  _viewContextMethods: {
    _updateViewContext(): void;
    _applyViewTransform(): void;
    _sendAvailableViews(): void;
    updateGraphData(data: IGraphData): void;
    getGraphData(): IGraphData;
  };
  _viewSelectionMethods: {
    changeView(viewId: string): Promise<void>;
    setFocusedFile(filePath: string | undefined): void;
    setDepthLimit(depthLimit: number): Promise<void>;
    getDepthLimit(): number;
  };
  _webviewMethods: {
    _sendMessage(message: unknown): void;
    _setWebviewMessageListener(webview: unknown): void;
    _getHtmlForWebview(webview: unknown): string;
    resolveWebviewView(webviewView: unknown, context: unknown, token: unknown): void;
    openInEditor(): void;
    sendToWebview(message: unknown): void;
    onWebviewMessage(handler: (message: unknown) => void): unknown;
  };
}

export function getGraphViewProviderInternals(
  provider: GraphViewProvider,
): GraphViewProviderInternals {
  return provider as unknown as GraphViewProviderInternals;
}
