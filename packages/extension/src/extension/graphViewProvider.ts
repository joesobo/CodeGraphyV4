/**
 * @fileoverview Provides the webview panel for displaying the dependency graph.
 * Handles communication between the extension and the React webview,
 * including graph data updates and position persistence.
 * @module extension/GraphViewProvider
 */

import * as vscode from 'vscode';
import type { IGraphData } from '../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../shared/protocol/extensionToWebview';
import type { IGroup } from '../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../shared/settings/modes';
import type { IPhysicsSettings } from '../shared/settings/physics';
import { EventBus, EventName, EventPayloads } from '../core/plugins/eventBus';
import { DecorationManager } from '../core/plugins/decoration/manager';
import { WorkspaceAnalyzer } from './workspaceAnalyzer/service';
import { GitHistoryAnalyzer } from './gitHistory/analyzer';
import { ViewRegistry } from '../core/views/registry';
import { coreViews } from '../core/views/builtIns';
import type { IViewContext } from '../core/views/contracts';
import {
  type GraphViewExternalPluginRegistrationOptions,
} from './graphView/webview/plugins/registration';
import {
  initializeGraphViewProviderServices,
  restoreGraphViewProviderState,
} from './graphView/provider/bootstrap';
import {
  createGraphViewProviderAnalysisMethods,
  type GraphViewProviderAnalysisMethodsSource,
} from './graphView/provider/analysis/methods';
import {
  createGraphViewProviderCommandMethods,
  type GraphViewProviderCommandMethodsSource,
} from './graphView/provider/commands';
import {
  createGraphViewProviderFileActionMethods,
  type GraphViewProviderFileActionMethodsSource,
} from './graphView/provider/file/actions';
import {
  createGraphViewProviderFileVisitMethods,
  type GraphViewProviderFileVisitMethodsSource,
} from './graphView/provider/file/visits';
import {
  createGraphViewProviderPluginMethods,
  type GraphViewProviderPluginMethodsSource,
} from './graphView/provider/plugins';
import {
  createGraphViewProviderPluginResourceMethods,
  type GraphViewProviderPluginResourceMethodsSource,
} from './graphView/provider/pluginResources';
import {
  createGraphViewProviderPhysicsSettingsMethods,
  type GraphViewProviderPhysicsSettingsMethodsSource,
} from './graphView/provider/physicsSettings';
import {
  createGraphViewProviderRefreshMethods,
  type GraphViewProviderRefreshMethodsSource,
} from './graphView/provider/refresh';
import {
  createGraphViewProviderSettingsStateMethods,
  type GraphViewProviderSettingsStateMethodsSource,
} from './graphView/provider/settingsState';
import {
  createGraphViewProviderTimelineMethods,
  type GraphViewProviderTimelineMethodsSource,
} from './graphView/provider/timeline/methods';
import {
  createGraphViewProviderViewContextMethods,
  type GraphViewProviderViewContextMethodsSource,
} from './graphView/provider/view/context';
import {
  createGraphViewProviderViewSelectionMethods,
  type GraphViewProviderViewSelectionMethodsSource,
} from './graphView/provider/view/selection';
import {
  createGraphViewProviderWebviewMethods,
  type GraphViewProviderWebviewSource,
} from './graphView/provider/webview/host';

/** Storage key for selected view per workspace */
const SELECTED_VIEW_KEY = 'codegraphy.selectedView';

/** Storage key for DAG layout mode per workspace */
const DAG_MODE_KEY = 'codegraphy.dagMode';

/** Storage key for node size mode per workspace */
const NODE_SIZE_MODE_KEY = 'codegraphy.nodeSizeMode';

/** Default depth limit for depth graph view */
const DEFAULT_DEPTH_LIMIT = 1;

type GraphViewProviderMethodSource =
  & GraphViewProviderAnalysisMethodsSource
  & GraphViewProviderCommandMethodsSource
  & GraphViewProviderFileActionMethodsSource
  & GraphViewProviderFileVisitMethodsSource
  & GraphViewProviderPluginMethodsSource
  & GraphViewProviderPluginResourceMethodsSource
  & GraphViewProviderPhysicsSettingsMethodsSource
  & GraphViewProviderRefreshMethodsSource
  & GraphViewProviderSettingsStateMethodsSource
  & GraphViewProviderTimelineMethodsSource
  & GraphViewProviderViewContextMethodsSource
  & GraphViewProviderViewSelectionMethodsSource
  & GraphViewProviderWebviewSource;

/**
 * Provides the webview panel that displays the CodeGraphy dependency graph.
 * 
 * This class implements `vscode.WebviewViewProvider` to register as a sidebar
 * view provider. It manages:
 * - Webview HTML content generation
 * - Message passing between extension and webview
 * - Node position persistence to workspace state
 * - File opening/preview requests from graph interactions
 * 
 * @example
 * ```typescript
 * // Registration in extension activation
 * const provider = new GraphViewProvider(context.extensionUri, context);
 * context.subscriptions.push(
 *   vscode.window.registerWebviewViewProvider(
 *     GraphViewProvider.viewType,
 *     provider
 *   )
 * );
 * ```
 */
export class GraphViewProvider implements vscode.WebviewViewProvider {
  /** The view type identifier used in package.json contribution */
  public static readonly viewType = 'codegraphy.graphView';

  /** Reference to the sidebar webview view, undefined until resolved */
  protected _view?: vscode.WebviewView;

  /** Active editor panels (opened via "Open in Editor") */
  protected _panels: vscode.WebviewPanel[] = [];
  
  /** Current graph data being displayed */
  private _graphData: IGraphData = { nodes: [], edges: [] };
  
  /** Workspace analyzer for real file discovery */
  private _analyzer?: WorkspaceAnalyzer;

  /** Whether the analyzer has been initialized */
  protected _analyzerInitialized = false;

  /** In-flight analyzer initialization promise (deduplicates concurrent starts). */
  protected _analyzerInitPromise?: Promise<void>;

  /** Abort controller for the currently running analysis (if any). */
  protected _analysisController?: AbortController;

  /** Monotonic analysis request counter; latest request wins. */
  protected _analysisRequestId = 0;

  /** View registry for managing available views */
  private readonly _viewRegistry: ViewRegistry;

  /** Currently active view ID */
  protected _activeViewId: string;

  /** Current DAG layout mode (null = free-form physics) */
  protected _dagMode: DagMode = null;

  /** Current node size mode */
  protected _nodeSizeMode: NodeSizeMode = 'connections';

  /** Raw (untransformed) graph data from analysis */
  protected _rawGraphData: IGraphData = { nodes: [], edges: [] };

  /** Current view context */
  protected _viewContext: IViewContext = {
    activePlugins: new Set(),
    depthLimit: DEFAULT_DEPTH_LIMIT,
  };

  /** Groups for client-side file coloring (computed merged result) */
  protected _groups: IGroup[] = [];

  /** User-defined groups (persisted to settings.json) */
  protected _userGroups: IGroup[] = [];

  /** Plugin default group IDs that the user has hidden */
  protected _hiddenPluginGroupIds = new Set<string>();

  /** Filter patterns passed to analysis (extension-side exclusions) */
  protected _filterPatterns: string[] = [];

  /** Disabled rule qualified IDs (e.g., "codegraphy.typescript:es6-import") */
  protected _disabledRules: Set<string> = new Set();

  /** Disabled plugin IDs (e.g., "codegraphy.typescript") */
  protected _disabledPlugins: Set<string> = new Set();

  /** Git history analyzer for timeline feature */
  protected _gitAnalyzer?: GitHistoryAnalyzer;

  /** SHA of the currently displayed commit */
  protected _currentCommitSha?: string;

  /** Whether the timeline mode is active */
  protected _timelineActive = false;

  /** EventBus for plugin event system */
  private _eventBus: EventBus;

  /** DecorationManager for plugin decorations */
  private _decorationManager: DecorationManager;

  /** Whether this is the first analysis (for notifyWorkspaceReady) */
  protected _firstAnalysis = true;

  /** Resolves when first workspace-ready lifecycle dispatch has occurred. */
  protected _resolveFirstWorkspaceReady?: () => void;

  /** Promise that settles when first workspace-ready lifecycle dispatch has occurred. */
  protected readonly _firstWorkspaceReadyPromise: Promise<void>;

  /** Whether webview-ready lifecycle has already fired. */
  protected _webviewReadyNotified = false;

  /** Abort controller for timeline indexing */
  protected _indexingController?: AbortController;

  /** Source extension roots for externally registered plugins (Tier-2 assets). */
  protected readonly _pluginExtensionUris = new Map<string, vscode.Uri>();

  private readonly _analysisMethods: ReturnType<typeof createGraphViewProviderAnalysisMethods>;
  private readonly _commandMethods: ReturnType<typeof createGraphViewProviderCommandMethods>;
  private readonly _fileActionMethods: ReturnType<typeof createGraphViewProviderFileActionMethods>;
  private readonly _fileVisitMethods: ReturnType<typeof createGraphViewProviderFileVisitMethods>;
  private readonly _pluginMethods: ReturnType<typeof createGraphViewProviderPluginMethods>;
  private readonly _pluginResourceMethods:
    ReturnType<typeof createGraphViewProviderPluginResourceMethods>;
  private readonly _physicsSettingsMethods:
    ReturnType<typeof createGraphViewProviderPhysicsSettingsMethods>;
  private readonly _refreshMethods: ReturnType<typeof createGraphViewProviderRefreshMethods>;
  private readonly _settingsStateMethods:
    ReturnType<typeof createGraphViewProviderSettingsStateMethods>;
  private readonly _timelineMethods: ReturnType<typeof createGraphViewProviderTimelineMethods>;
  private readonly _viewContextMethods:
    ReturnType<typeof createGraphViewProviderViewContextMethods>;
  private readonly _viewSelectionMethods:
    ReturnType<typeof createGraphViewProviderViewSelectionMethods>;
  private readonly _webviewMethods: ReturnType<typeof createGraphViewProviderWebviewMethods>;

  private _createMethodSource(): GraphViewProviderMethodSource {
    // The adapter exposes a public source shape over private provider state.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const owner = this;

    return {
      get _view() {
        return owner._view;
      },
      set _view(view) {
        owner._view = view;
      },
      get _panels() {
        return owner._panels;
      },
      set _panels(panels) {
        owner._panels = panels;
      },
      get _graphData() {
        return owner._graphData;
      },
      set _graphData(graphData) {
        owner._graphData = graphData;
      },
      get _analyzer() {
        return owner._analyzer;
      },
      set _analyzer(analyzer) {
        owner._analyzer = analyzer;
      },
      get _analyzerInitialized() {
        return owner._analyzerInitialized;
      },
      set _analyzerInitialized(analyzerInitialized) {
        owner._analyzerInitialized = analyzerInitialized;
      },
      get _analyzerInitPromise() {
        return owner._analyzerInitPromise;
      },
      set _analyzerInitPromise(analyzerInitPromise) {
        owner._analyzerInitPromise = analyzerInitPromise;
      },
      get _analysisController() {
        return owner._analysisController;
      },
      set _analysisController(analysisController) {
        owner._analysisController = analysisController;
      },
      get _analysisRequestId() {
        return owner._analysisRequestId;
      },
      set _analysisRequestId(analysisRequestId) {
        owner._analysisRequestId = analysisRequestId;
      },
      get _viewRegistry() {
        return owner._viewRegistry;
      },
      get _activeViewId() {
        return owner._activeViewId;
      },
      set _activeViewId(activeViewId) {
        owner._activeViewId = activeViewId;
      },
      get _dagMode() {
        return owner._dagMode;
      },
      set _dagMode(dagMode) {
        owner._dagMode = dagMode;
      },
      get _nodeSizeMode() {
        return owner._nodeSizeMode;
      },
      set _nodeSizeMode(nodeSizeMode) {
        owner._nodeSizeMode = nodeSizeMode;
      },
      get _rawGraphData() {
        return owner._rawGraphData;
      },
      set _rawGraphData(rawGraphData) {
        owner._rawGraphData = rawGraphData;
      },
      get _viewContext() {
        return owner._viewContext;
      },
      set _viewContext(viewContext) {
        owner._viewContext = viewContext;
      },
      get _groups() {
        return owner._groups;
      },
      set _groups(groups) {
        owner._groups = groups;
      },
      get _userGroups() {
        return owner._userGroups;
      },
      set _userGroups(userGroups) {
        owner._userGroups = userGroups;
      },
      get _hiddenPluginGroupIds() {
        return owner._hiddenPluginGroupIds;
      },
      set _hiddenPluginGroupIds(hiddenPluginGroupIds) {
        owner._hiddenPluginGroupIds = hiddenPluginGroupIds;
      },
      get _filterPatterns() {
        return owner._filterPatterns;
      },
      set _filterPatterns(filterPatterns) {
        owner._filterPatterns = filterPatterns;
      },
      get _disabledRules() {
        return owner._disabledRules;
      },
      set _disabledRules(disabledRules) {
        owner._disabledRules = disabledRules;
      },
      get _disabledPlugins() {
        return owner._disabledPlugins;
      },
      set _disabledPlugins(disabledPlugins) {
        owner._disabledPlugins = disabledPlugins;
      },
      get _gitAnalyzer() {
        return owner._gitAnalyzer;
      },
      set _gitAnalyzer(gitAnalyzer) {
        owner._gitAnalyzer = gitAnalyzer;
      },
      get _currentCommitSha() {
        return owner._currentCommitSha;
      },
      set _currentCommitSha(currentCommitSha) {
        owner._currentCommitSha = currentCommitSha;
      },
      get _timelineActive() {
        return owner._timelineActive;
      },
      set _timelineActive(timelineActive) {
        owner._timelineActive = timelineActive;
      },
      get _eventBus() {
        return owner._eventBus;
      },
      get _decorationManager() {
        return owner._decorationManager;
      },
      get _firstAnalysis() {
        return owner._firstAnalysis;
      },
      set _firstAnalysis(firstAnalysis) {
        owner._firstAnalysis = firstAnalysis;
      },
      get _resolveFirstWorkspaceReady() {
        return owner._resolveFirstWorkspaceReady;
      },
      set _resolveFirstWorkspaceReady(resolveFirstWorkspaceReady) {
        owner._resolveFirstWorkspaceReady = resolveFirstWorkspaceReady;
      },
      get _firstWorkspaceReadyPromise() {
        return owner._firstWorkspaceReadyPromise;
      },
      get _webviewReadyNotified() {
        return owner._webviewReadyNotified;
      },
      set _webviewReadyNotified(webviewReadyNotified) {
        owner._webviewReadyNotified = webviewReadyNotified;
      },
      get _indexingController() {
        return owner._indexingController;
      },
      set _indexingController(indexingController) {
        owner._indexingController = indexingController;
      },
      get _pluginExtensionUris() {
        return owner._pluginExtensionUris;
      },
      get _extensionUri() {
        return owner._extensionUri;
      },
      get _context() {
        return owner._context;
      },
      _sendMessage: message => owner._sendMessage(message),
      _sendAvailableViews: () => owner._sendAvailableViews(),
      _computeMergedGroups: () => owner._computeMergedGroups(),
      _sendGroupsUpdated: () => owner._sendGroupsUpdated(),
      _updateViewContext: () => owner._updateViewContext(),
      _applyViewTransform: () => owner._applyViewTransform(),
      _sendPluginStatuses: () => owner._sendPluginStatuses(),
      _sendDecorations: () => owner._sendDecorations(),
      _sendContextMenuItems: () => owner._sendContextMenuItems(),
      _sendPluginWebviewInjections: () => owner._sendPluginWebviewInjections(),
      _analyzeAndSendData: () => owner._analyzeAndSendData(),
      _doAnalyzeAndSendData: (signal, requestId) =>
        owner._doAnalyzeAndSendData(signal, requestId),
      _markWorkspaceReady: graph => owner._markWorkspaceReady(graph),
      _isAnalysisStale: (signal, requestId) => owner._isAnalysisStale(signal, requestId),
      _isAbortError: error => owner._isAbortError(error),
      _registerBuiltInPluginRoots: () => owner._registerBuiltInPluginRoots(),
      _resolveWebviewAssetPath: (assetPath, pluginId) =>
        owner._resolveWebviewAssetPath(assetPath, pluginId),
      _refreshWebviewResourceRoots: () => owner._refreshWebviewResourceRoots(),
      _normalizeExternalExtensionUri: uri => owner._normalizeExternalExtensionUri(uri),
      _loadDisabledRulesAndPlugins: () => owner._loadDisabledRulesAndPlugins(),
      _sendSettings: () => owner._sendSettings(),
      _sendPhysicsSettings: () => owner._sendPhysicsSettings(),
      _rebuildAndSend: () => owner._rebuildAndSend(),
      _smartRebuild: (kind, id) => owner._smartRebuild(kind, id),
      _getPhysicsSettings: () => owner._getPhysicsSettings(),
      _loadGroupsAndFilterPatterns: () => owner._loadGroupsAndFilterPatterns(),
      _sendAllSettings: () => owner._sendAllSettings(),
      _getLocalResourceRoots: () => owner._getLocalResourceRoots(),
      _openFile: (
        filePath: string,
        behavior?: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
      ) => owner._openFile(filePath, behavior),
      _revealInExplorer: (filePath: string) => owner._revealInExplorer(filePath),
      _copyToClipboard: (text: string) => owner._copyToClipboard(text),
      _deleteFiles: (paths: string[]) => owner._deleteFiles(paths),
      _renameFile: (filePath: string) => owner._renameFile(filePath),
      _createFile: (directory: string) => owner._createFile(directory),
      _toggleFavorites: (paths: string[]) => owner._toggleFavorites(paths),
      _getFileInfo: (filePath: string) => owner._getFileInfo(filePath),
      _getVisitCount: (filePath: string) => owner._getVisitCount(filePath),
      _incrementVisitCount: (filePath: string) => owner._incrementVisitCount(filePath),
      _addToExclude: (patterns: string[]) => owner._addToExclude(patterns),
      _indexRepository: () => owner._indexRepository(),
      _jumpToCommit: (sha: string) => owner._jumpToCommit(sha),
      _openSelectedNode: (nodeId: string) => owner._openSelectedNode(nodeId),
      _activateNode: (nodeId: string) => owner._activateNode(nodeId),
      _previewFileAtCommit: (
        sha: string,
        filePath: string,
        behavior?: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
      ) =>
        owner._previewFileAtCommit(sha, filePath, behavior),
      _sendCachedTimeline: () => owner._sendCachedTimeline(),
      changeView: (viewId: string) => owner.changeView(viewId),
      setDepthLimit: (depthLimit: number) => owner.setDepthLimit(depthLimit),
      undo: () => owner.undo(),
      redo: () => owner.redo(),
      _updatePhysicsSetting: (key, value) => owner._updatePhysicsSetting(key, value),
      _resetPhysicsSettings: () => owner._resetPhysicsSettings(),
      _sendFavorites: () => owner._sendFavorites(),
    };
  }

  /**
   * Creates a new GraphViewProvider.
   *
   * @param _extensionUri - URI of the extension's installation directory
   * @param _context - Extension context for accessing workspace state
   */
  constructor(
    protected readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    this._firstWorkspaceReadyPromise = new Promise<void>((resolve) => {
      this._resolveFirstWorkspaceReady = resolve;
    });

    this._analyzer = new WorkspaceAnalyzer(_context);
    this._viewRegistry = new ViewRegistry();
    this._eventBus = new EventBus();
    this._decorationManager = new DecorationManager();

    initializeGraphViewProviderServices({
      analyzer:
        this._analyzer as Parameters<typeof initializeGraphViewProviderServices>[0]['analyzer'],
      viewRegistry: this._viewRegistry,
      coreViews,
      eventBus: this._eventBus,
      decorationManager: this._decorationManager,
      getGraphData: () => this._graphData,
      registerCommand: (id, action) => vscode.commands.registerCommand(id, action),
      pushSubscription: subscription => {
        this._context.subscriptions.push(subscription as vscode.Disposable);
      },
      sendMessage: msg => this._sendMessage(msg as ExtensionToWebviewMessage),
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
      onDecorationsChanged: () => {
        this._sendDecorations();
      },
    });

    const restoredState = restoreGraphViewProviderState({
      workspaceState: this._context.workspaceState,
      viewRegistry: this._viewRegistry,
      selectedViewKey: SELECTED_VIEW_KEY,
      dagModeKey: DAG_MODE_KEY,
      nodeSizeModeKey: NODE_SIZE_MODE_KEY,
      fallbackViewId: 'codegraphy.connections',
      fallbackNodeSizeMode: 'connections',
    });
    this._activeViewId = restoredState.activeViewId;
    this._dagMode = restoredState.dagMode;
    this._nodeSizeMode = restoredState.nodeSizeMode;

    const methodSource = this._createMethodSource();
    this._analysisMethods = createGraphViewProviderAnalysisMethods(methodSource);
    this._commandMethods = createGraphViewProviderCommandMethods(methodSource);
    this._fileActionMethods = createGraphViewProviderFileActionMethods(methodSource);
    this._fileVisitMethods = createGraphViewProviderFileVisitMethods(methodSource);
    this._pluginResourceMethods = createGraphViewProviderPluginResourceMethods(methodSource);
    this._pluginMethods = createGraphViewProviderPluginMethods(methodSource);
    this._physicsSettingsMethods = createGraphViewProviderPhysicsSettingsMethods(methodSource);
    this._refreshMethods = createGraphViewProviderRefreshMethods(methodSource);
    this._settingsStateMethods = createGraphViewProviderSettingsStateMethods(methodSource);
    this._timelineMethods = createGraphViewProviderTimelineMethods(methodSource);
    this._viewContextMethods = createGraphViewProviderViewContextMethods(methodSource);
    this._viewSelectionMethods = createGraphViewProviderViewSelectionMethods(methodSource);
    this._webviewMethods = createGraphViewProviderWebviewMethods(methodSource);

    this._loadDisabledRulesAndPlugins();
  }

  /**
   * Gets the view registry for external access (e.g., plugin registration).
   */
  public get viewRegistry(): ViewRegistry {
    return this._viewRegistry;
  }

  public readonly refresh = (): Promise<void> => this._refreshMethods.refresh();
  public readonly refreshPhysicsSettings = (): void =>
    this._refreshMethods.refreshPhysicsSettings();
  public readonly refreshSettings = (): void => this._refreshMethods.refreshSettings();
  public readonly refreshToggleSettings = (): void =>
    this._refreshMethods.refreshToggleSettings();
  public readonly clearCacheAndRefresh = (): Promise<void> =>
    this._refreshMethods.clearCacheAndRefresh();
  public readonly sendCommand = (
    command:
      | 'FIT_VIEW'
      | 'ZOOM_IN'
      | 'ZOOM_OUT'
      | 'CYCLE_VIEW'
      | 'CYCLE_LAYOUT'
      | 'TOGGLE_DIMENSION',
  ): void => this._commandMethods.sendCommand(command);
  public readonly undo = (): Promise<string | undefined> => this._commandMethods.undo();
  public readonly redo = (): Promise<string | undefined> => this._commandMethods.redo();
  public readonly canUndo = (): boolean => this._commandMethods.canUndo();
  public readonly canRedo = (): boolean => this._commandMethods.canRedo();
  public readonly requestExportPng = (): void => this._commandMethods.requestExportPng();
  public readonly requestExportSvg = (): void => this._commandMethods.requestExportSvg();
  public readonly requestExportJpeg = (): void => this._commandMethods.requestExportJpeg();
  public readonly requestExportJson = (): void => this._commandMethods.requestExportJson();
  public readonly requestExportMarkdown = (): void =>
    this._commandMethods.requestExportMarkdown();
  public readonly emitEvent = <E extends EventName>(
    event: E,
    payload: EventPayloads[E],
  ): void => this._commandMethods.emitEvent(event, payload);
  public readonly resolveWebviewView = (
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): void => this._webviewMethods.resolveWebviewView(webviewView, context, token);
  public readonly updateGraphData = (data: IGraphData): void =>
    this._viewContextMethods.updateGraphData(data);
  public readonly getGraphData = (): IGraphData => this._viewContextMethods.getGraphData();
  protected readonly _analyzeAndSendData = (): Promise<void> =>
    this._analysisMethods._analyzeAndSendData();
  protected readonly _doAnalyzeAndSendData = (
    signal: AbortSignal,
    requestId: number,
  ): Promise<void> => this._analysisMethods._doAnalyzeAndSendData(signal, requestId);
  protected readonly _markWorkspaceReady = (graph: IGraphData): void =>
    this._analysisMethods._markWorkspaceReady(graph);
  protected readonly _isAnalysisStale = (signal: AbortSignal, requestId: number): boolean =>
    this._analysisMethods._isAnalysisStale(signal, requestId);
  protected readonly _isAbortError = (error: unknown): boolean =>
    this._analysisMethods._isAbortError(error);
  protected readonly _rebuildAndSend = (): void => this._refreshMethods._rebuildAndSend();
  protected readonly _smartRebuild = (kind: 'rule' | 'plugin', id: string): void =>
    this._refreshMethods._smartRebuild(kind, id);
  protected readonly _indexRepository = (): Promise<void> =>
    this._timelineMethods._indexRepository();
  protected readonly _jumpToCommit = (sha: string): Promise<void> =>
    this._timelineMethods._jumpToCommit(sha);
  protected readonly _openSelectedNode = (nodeId: string): Promise<void> =>
    this._timelineMethods._openSelectedNode(nodeId);
  protected readonly _activateNode = (nodeId: string): Promise<void> =>
    this._timelineMethods._activateNode(nodeId);
  protected readonly _openNodeInEditor = (
    nodeId: string,
    behavior: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
  ): Promise<void> => this._timelineMethods._openNodeInEditor(nodeId, behavior);
  protected readonly _previewFileAtCommit = (
    sha: string,
    filePath: string,
    behavior?: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
  ): Promise<void> => this._timelineMethods._previewFileAtCommit(sha, filePath, behavior);
  protected readonly _sendCachedTimeline = (): void => this._timelineMethods._sendCachedTimeline();
  public readonly sendPlaybackSpeed = (): void => this._timelineMethods.sendPlaybackSpeed();
  public readonly invalidateTimelineCache = (): Promise<void> =>
    this._timelineMethods.invalidateTimelineCache();
  protected readonly _openFile = (
    filePath: string,
    behavior?: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
  ): Promise<void> => this._fileActionMethods._openFile(filePath, behavior);
  protected readonly _revealInExplorer = (filePath: string): Promise<void> =>
    this._fileActionMethods._revealInExplorer(filePath);
  protected readonly _copyToClipboard = (text: string): Promise<void> =>
    this._fileActionMethods._copyToClipboard(text);
  protected readonly _deleteFiles = (paths: string[]): Promise<void> =>
    this._fileActionMethods._deleteFiles(paths);
  protected readonly _renameFile = (filePath: string): Promise<void> =>
    this._fileActionMethods._renameFile(filePath);
  protected readonly _createFile = (directory: string): Promise<void> =>
    this._fileActionMethods._createFile(directory);
  protected readonly _toggleFavorites = (paths: string[]): Promise<void> =>
    this._fileActionMethods._toggleFavorites(paths);
  protected readonly _loadGroupsAndFilterPatterns = (): void =>
    this._settingsStateMethods._loadGroupsAndFilterPatterns();
  protected readonly _loadDisabledRulesAndPlugins = (): boolean =>
    this._settingsStateMethods._loadDisabledRulesAndPlugins();
  protected readonly _sendFavorites = (): void => this._fileVisitMethods._sendFavorites();
  protected readonly _sendSettings = (): void => this._settingsStateMethods._sendSettings();
  protected readonly _getFileInfo = (filePath: string): Promise<void> =>
    this._fileVisitMethods._getFileInfo(filePath);
  protected readonly _getVisitCount = (filePath: string): number =>
    this._fileVisitMethods._getVisitCount(filePath);
  protected readonly _incrementVisitCount = (filePath: string): Promise<void> =>
    this._fileVisitMethods._incrementVisitCount(filePath);
  public readonly trackFileVisit = (filePath: string): Promise<void> =>
    this._fileVisitMethods.trackFileVisit(filePath);
  protected readonly _addToExclude = (patterns: string[]): Promise<void> =>
    this._fileVisitMethods._addToExclude(patterns);
  protected readonly _getPhysicsSettings = (): IPhysicsSettings =>
    this._physicsSettingsMethods._getPhysicsSettings();
  protected readonly _sendPhysicsSettings = (): void =>
    this._physicsSettingsMethods._sendPhysicsSettings();
  protected readonly _sendAllSettings = (): void => this._settingsStateMethods._sendAllSettings();
  protected readonly _updatePhysicsSetting = (
    key: keyof IPhysicsSettings,
    value: number,
  ): Promise<void> => this._physicsSettingsMethods._updatePhysicsSetting(key, value);
  protected readonly _resetPhysicsSettings = (): Promise<void> =>
    this._physicsSettingsMethods._resetPhysicsSettings();
  protected readonly _registerBuiltInPluginRoots = (): void =>
    this._pluginResourceMethods._registerBuiltInPluginRoots();
  protected readonly _getPluginDefaultGroups = (): IGroup[] =>
    this._pluginResourceMethods._getPluginDefaultGroups();
  protected readonly _getBuiltInDefaultGroups = (): IGroup[] =>
    this._pluginResourceMethods._getBuiltInDefaultGroups();
  protected readonly _computeMergedGroups = (): void =>
    this._pluginResourceMethods._computeMergedGroups();
  protected readonly _sendAvailableViews = (): void =>
    this._viewContextMethods._sendAvailableViews();
  protected readonly _sendPluginStatuses = (): void => this._pluginMethods._sendPluginStatuses();
  protected readonly _sendDecorations = (): void => this._pluginMethods._sendDecorations();
  protected readonly _sendContextMenuItems = (): void =>
    this._pluginMethods._sendContextMenuItems();
  protected readonly _sendPluginWebviewInjections = (): void =>
    this._pluginMethods._sendPluginWebviewInjections();
  protected readonly _resolveWebviewAssetPath = (assetPath: string, pluginId?: string): string =>
    this._pluginResourceMethods._resolveWebviewAssetPath(assetPath, pluginId);
  protected readonly _getLocalResourceRoots = (): vscode.Uri[] =>
    this._pluginResourceMethods._getLocalResourceRoots();
  protected readonly _refreshWebviewResourceRoots = (): void =>
    this._pluginResourceMethods._refreshWebviewResourceRoots();
  protected readonly _normalizeExternalExtensionUri = (
    uri: vscode.Uri | string | undefined,
  ): vscode.Uri | undefined => this._pluginResourceMethods._normalizeExternalExtensionUri(uri);
  protected readonly _sendGroupsUpdated = (): void => this._pluginMethods._sendGroupsUpdated();
  public readonly registerExternalPlugin = (
    plugin: unknown,
    options?: GraphViewExternalPluginRegistrationOptions,
  ): void => this._pluginMethods.registerExternalPlugin(plugin, options);
  protected readonly _updateViewContext = (): void => this._viewContextMethods._updateViewContext();
  protected readonly _applyViewTransform = (): void =>
    this._viewContextMethods._applyViewTransform();
  public readonly changeView = (viewId: string): Promise<void> =>
    this._viewSelectionMethods.changeView(viewId);
  public readonly setFocusedFile = (filePath: string | undefined): void =>
    this._viewSelectionMethods.setFocusedFile(filePath);
  public readonly setDepthLimit = (depthLimit: number): Promise<void> =>
    this._viewSelectionMethods.setDepthLimit(depthLimit);
  public readonly getDepthLimit = (): number => this._viewSelectionMethods.getDepthLimit();
  public readonly openInEditor = (): void => this._webviewMethods.openInEditor();
  public readonly sendToWebview = (message: unknown): void =>
    this._webviewMethods.sendToWebview(message);
  public readonly onWebviewMessage = (
    handler: (message: unknown) => void,
  ): vscode.Disposable => this._webviewMethods.onWebviewMessage(handler);
  protected readonly _sendMessage = (message: ExtensionToWebviewMessage): void =>
    this._webviewMethods._sendMessage(message);
  protected readonly _setWebviewMessageListener = (webview: vscode.Webview): void =>
    this._webviewMethods._setWebviewMessageListener(webview);
  protected readonly _getHtmlForWebview = (webview: vscode.Webview): string =>
    this._webviewMethods._getHtmlForWebview(webview);

}
