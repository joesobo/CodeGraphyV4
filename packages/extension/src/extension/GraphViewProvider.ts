/**
 * @fileoverview Provides the webview panel for displaying the dependency graph.
 * Handles communication between the extension and the React webview,
 * including graph data updates and position persistence.
 * @module extension/GraphViewProvider
 */

import * as vscode from 'vscode';
import {
  IGraphData,
  DagMode,
  IPhysicsSettings,
  IGroup,
  NodeSizeMode,
  ExtensionToWebviewMessage,
  DEFAULT_FOLDER_NODE_COLOR,
} from '../shared/types';
import { EventBus, EventName, EventPayloads } from '../core/plugins/EventBus';
import { DecorationManager } from '../core/plugins/DecorationManager';
import { WorkspaceAnalyzer } from './WorkspaceAnalyzer';
import { GitHistoryAnalyzer } from './GitHistoryAnalyzer';
import { ViewRegistry, coreViews, IViewContext } from '../core/views';
import {
  applyGraphViewTransform,
} from './graphViewPresentation';
import { createGraphViewHtml, createGraphViewNonce } from './graphViewHtml';
import {
  type GraphViewExternalPluginRegistrationOptions,
} from './graphView/externalPluginRegistration';
import { openGraphViewInEditor } from './graphView/editorPanel';
import {
  initializeGraphViewProviderServices,
  restoreGraphViewProviderState,
} from './graphView/providerBootstrap';
import { createGraphViewProviderAnalysisMethods } from './graphView/providerAnalysisMethods';
import { createGraphViewProviderCommandMethods } from './graphView/providerCommandMethods';
import { createGraphViewProviderFileActionMethods } from './graphView/providerFileActionMethods';
import { createGraphViewProviderFileVisitMethods } from './graphView/providerFileVisitMethods';
import { createGraphViewProviderPluginMethods } from './graphView/providerPluginMethods';
import { createGraphViewProviderPluginResourceMethods } from './graphView/providerPluginResourceMethods';
import { createGraphViewProviderRefreshMethods } from './graphView/providerRefreshMethods';
import { createGraphViewProviderSettingsMethods } from './graphView/providerSettingsMethods';
import { createGraphViewProviderTimelineMethods } from './graphView/providerTimelineMethods';
import { resolveGraphViewWebviewView } from './graphView/resolveWebview';
import {
  buildGraphViewContext,
} from './graphView/viewContext';
import {
  changeGraphViewView,
  getGraphViewDepthLimit,
  setGraphViewDepthLimit,
  setGraphViewFocusedFile,
} from './graphView/viewSelection';
import {
  normalizeFolderNodeColor,
} from './graphViewSettings';
import {
  setGraphViewProviderMessageListener,
  type GraphViewProviderMessageListenerSource,
} from './graphView/messages/providerListener';
import {
  onGraphViewWebviewMessage,
  sendGraphViewWebviewMessage,
} from './graphView/webviewBridge';

/** Storage key for selected view per workspace */
const SELECTED_VIEW_KEY = 'codegraphy.selectedView';

/** Storage key for depth limit per workspace */
const DEPTH_LIMIT_KEY = 'codegraphy.depthLimit';

/** Storage key for DAG layout mode per workspace */
const DAG_MODE_KEY = 'codegraphy.dagMode';

/** Storage key for node size mode per workspace */
const NODE_SIZE_MODE_KEY = 'codegraphy.nodeSizeMode';

/** Default depth limit for depth graph view */
const DEFAULT_DEPTH_LIMIT = 1;

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
  private _view?: vscode.WebviewView;

  /** Active editor panels (opened via "Open in Editor") */
  private _panels: vscode.WebviewPanel[] = [];
  
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
  private _activeViewId: string;

  /** Current DAG layout mode (null = free-form physics) */
  protected _dagMode: DagMode = null;

  /** Current node size mode */
  protected _nodeSizeMode: NodeSizeMode = 'connections';

  /** Raw (untransformed) graph data from analysis */
  private _rawGraphData: IGraphData = { nodes: [], edges: [] };

  /** Current view context */
  private _viewContext: IViewContext = {
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

  /**
   * Creates a new GraphViewProvider.
   *
   * @param _extensionUri - URI of the extension's installation directory
   * @param _context - Extension context for accessing workspace state
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
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

    Object.assign(
      this,
      createGraphViewProviderAnalysisMethods(this as never),
      createGraphViewProviderCommandMethods(this as never),
      createGraphViewProviderFileActionMethods(this as never),
      createGraphViewProviderFileVisitMethods(this as never),
      createGraphViewProviderPluginResourceMethods(this as never),
      createGraphViewProviderPluginMethods(this as never),
      createGraphViewProviderRefreshMethods(this as never),
      createGraphViewProviderSettingsMethods(this as never),
      createGraphViewProviderTimelineMethods(this as never),
    );

    this._loadDisabledRulesAndPlugins();
  }

  /**
   * Gets the view registry for external access (e.g., plugin registration).
   */
  public get viewRegistry(): ViewRegistry {
    return this._viewRegistry;
  }

  public declare refresh: () => Promise<void>;
  public declare refreshPhysicsSettings: () => void;
  public declare refreshSettings: () => void;
  public declare refreshToggleSettings: () => void;
  public declare clearCacheAndRefresh: () => Promise<void>;
  public declare sendCommand: (
    command:
      | 'FIT_VIEW'
      | 'ZOOM_IN'
      | 'ZOOM_OUT'
      | 'CYCLE_VIEW'
      | 'CYCLE_LAYOUT'
      | 'TOGGLE_DIMENSION',
  ) => void;
  public declare undo: () => Promise<string | undefined>;
  public declare redo: () => Promise<string | undefined>;
  public declare canUndo: () => boolean;
  public declare canRedo: () => boolean;
  public declare requestExportPng: () => void;
  public declare requestExportSvg: () => void;
  public declare requestExportJpeg: () => void;
  public declare requestExportJson: () => void;
  public declare requestExportMarkdown: () => void;
  private declare _analyzeAndSendData: () => Promise<void>;
  private declare _doAnalyzeAndSendData: (
    signal: AbortSignal,
    requestId: number,
  ) => Promise<void>;
  private declare _markWorkspaceReady: (graph: IGraphData) => void;
  private declare _isAnalysisStale: (signal: AbortSignal, requestId: number) => boolean;
  private declare _isAbortError: (error: unknown) => boolean;
  private declare _rebuildAndSend: () => void;
  protected declare _smartRebuild: (kind: 'rule' | 'plugin', id: string) => void;
  protected declare _indexRepository: () => Promise<void>;
  protected declare _jumpToCommit: (sha: string) => Promise<void>;
  protected declare _openSelectedNode: (nodeId: string) => Promise<void>;
  protected declare _activateNode: (nodeId: string) => Promise<void>;
  private declare _openNodeInEditor: (
    nodeId: string,
    behavior: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
  ) => Promise<void>;
  private declare _previewFileAtCommit: (
    sha: string,
    filePath: string,
    behavior?: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
  ) => Promise<void>;
  protected declare _sendCachedTimeline: () => void;
  public declare sendPlaybackSpeed: () => void;
  public declare invalidateTimelineCache: () => Promise<void>;
  private declare _openFile: (
    filePath: string,
    behavior?: Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>,
  ) => Promise<void>;
  protected declare _revealInExplorer: (filePath: string) => Promise<void>;
  protected declare _copyToClipboard: (text: string) => Promise<void>;
  protected declare _deleteFiles: (paths: string[]) => Promise<void>;
  protected declare _renameFile: (filePath: string) => Promise<void>;
  protected declare _createFile: (directory: string) => Promise<void>;
  protected declare _toggleFavorites: (paths: string[]) => Promise<void>;
  protected declare _loadGroupsAndFilterPatterns: () => void;
  protected declare _loadDisabledRulesAndPlugins: () => boolean;
  protected declare _sendFavorites: () => void;
  protected declare _sendSettings: () => void;
  protected declare _getFileInfo: (filePath: string) => Promise<void>;
  protected declare _getVisitCount: (filePath: string) => number;
  protected declare _incrementVisitCount: (filePath: string) => Promise<void>;
  public declare trackFileVisit: (filePath: string) => Promise<void>;
  protected declare _addToExclude: (patterns: string[]) => Promise<void>;
  protected declare _getPhysicsSettings: () => IPhysicsSettings;
  protected declare _sendPhysicsSettings: () => void;
  protected declare _sendAllSettings: () => void;
  protected declare _updatePhysicsSetting: (
    key: keyof IPhysicsSettings,
    value: number,
  ) => Promise<void>;
  protected declare _resetPhysicsSettings: () => Promise<void>;
  private declare _registerBuiltInPluginRoots: () => void;
  private declare _getPluginDefaultGroups: () => IGroup[];
  private declare _getBuiltInDefaultGroups: () => IGroup[];
  private declare _computeMergedGroups: () => void;
  private declare _sendAvailableViews: () => void;
  private declare _sendPluginStatuses: () => void;
  private declare _sendDecorations: () => void;
  private declare _sendContextMenuItems: () => void;
  private declare _sendPluginWebviewInjections: () => void;
  private declare _resolveWebviewAssetPath: (assetPath: string, pluginId?: string) => string;
  private declare _getLocalResourceRoots: () => vscode.Uri[];
  private declare _refreshWebviewResourceRoots: () => void;
  private declare _normalizeExternalExtensionUri: (
    uri: vscode.Uri | string | undefined,
  ) => vscode.Uri | undefined;
  private declare _sendGroupsUpdated: () => void;
  public declare registerExternalPlugin: (
    plugin: unknown,
    options?: GraphViewExternalPluginRegistrationOptions,
  ) => void;

  /**
   * Called by VSCode when the webview view needs to be resolved.
   * Sets up the webview options, HTML content, and message listeners.
   * 
   * @param webviewView - The webview view to resolve
   * @param _context - Context for the webview view resolution
   * @param _token - Cancellation token
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    resolveGraphViewWebviewView(webviewView, {
      getLocalResourceRoots: () => this._getLocalResourceRoots(),
      setWebviewMessageListener: nextWebview => {
        this._setWebviewMessageListener(nextWebview as vscode.Webview);
      },
      getHtml: nextWebview => this._getHtmlForWebview(nextWebview as vscode.Webview),
      executeCommand: (command, key, value) =>
        vscode.commands.executeCommand(command, key, value),
      analyzeAndSendData: () => this._analyzeAndSendData(),
      log: message => {
        console.log(message);
      },
    });

    // Do NOT proactively call _analyzeAndSendData() here.
    // The webview iframe has not loaded yet, so any postMessage sent now is silently
    // dropped. Initial data delivery is handled by the WEBVIEW_READY handler below,
    // which fires once the React app has mounted and is ready to receive messages.
  }

  /**
   * Updates the graph data and notifies the webview.
   * Applies any persisted positions before sending to webview.
   * 
   * @param data - New graph data to display
   * 
   * @example
   * ```typescript
   * provider.updateGraphData({
   *   nodes: [{ id: 'app.ts', label: 'app.ts', color: '#93C5FD' }],
   *   edges: []
   * });
   * ```
   */
  public updateGraphData(data: IGraphData): void {
    this._graphData = data;

    this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
  }

  /**
   * Returns the current graph data being displayed.
   * 
   * @returns Current graph data with nodes and edges
   */
  public getGraphData(): IGraphData {
    return this._graphData;
  }

  /**
   * Updates the view context with current state.
   */
  protected _updateViewContext(): void {
    const config = vscode.workspace.getConfiguration('codegraphy');
    this._viewContext = buildGraphViewContext({
      analyzer: this._analyzer,
      workspaceFolders: vscode.workspace.workspaceFolders,
      activeEditor: vscode.window.activeTextEditor,
      readSavedDepthLimit: () => this._context.workspaceState.get<number>(DEPTH_LIMIT_KEY),
      readFolderNodeColor: () =>
        normalizeFolderNodeColor(
          config.get<string>('folderNodeColor', DEFAULT_FOLDER_NODE_COLOR),
        ),
      asRelativePath: uri => vscode.workspace.asRelativePath(uri),
      defaultDepthLimit: DEFAULT_DEPTH_LIMIT,
    });
  }

  /**
   * Applies the current view's transform to the raw graph data.
   */
  private _applyViewTransform(): void {
    const result = applyGraphViewTransform(
      this._viewRegistry,
      this._activeViewId,
      this._viewContext,
      this._rawGraphData
    );
    this._activeViewId = result.activeViewId;
    this._graphData = result.graphData;

    if (result.persistSelectedViewId) {
      void this._context.workspaceState.update(SELECTED_VIEW_KEY, result.persistSelectedViewId);
    }
  }

  /**
   * Changes the active view.
   * 
   * @param viewId - ID of the view to switch to
   */
  public async changeView(viewId: string): Promise<void> {
    await changeGraphViewView(this as unknown as Parameters<typeof changeGraphViewView>[0], viewId, {
      isViewAvailable: (nextViewId, viewContext) =>
        this._viewRegistry.isViewAvailable(nextViewId, viewContext),
      persistActiveViewId: async nextViewId => {
        await this._context.workspaceState.update(SELECTED_VIEW_KEY, nextViewId);
      },
      applyViewTransform: () => this._applyViewTransform(),
      sendAvailableViews: () => this._sendAvailableViews(),
      sendMessage: message => this._sendMessage(message as ExtensionToWebviewMessage),
      logUnavailableView: nextViewId => {
        console.warn(`[CodeGraphy] View '${nextViewId}' is not available`);
      },
    });
  }

  /**
   * Sets the focused file for view context (e.g., for Depth Graph).
   * 
   * @param filePath - Relative path to the focused file
   */
  public setFocusedFile(filePath: string | undefined): void {
    setGraphViewFocusedFile(this as unknown as Parameters<typeof setGraphViewFocusedFile>[0], filePath, {
      getActiveViewInfo: nextViewId => this._viewRegistry.get(nextViewId),
      applyViewTransform: () => this._applyViewTransform(),
      sendAvailableViews: () => this._sendAvailableViews(),
      sendMessage: message => this._sendMessage(message as ExtensionToWebviewMessage),
    });
  }

  /**
   * Sets the depth limit for depth graph view.
   * 
   * @param depthLimit - Maximum number of hops from the focused node
   */
  public async setDepthLimit(depthLimit: number): Promise<void> {
    await setGraphViewDepthLimit(
      this as unknown as Parameters<typeof setGraphViewDepthLimit>[0],
      depthLimit,
      {
      persistDepthLimit: async nextDepthLimit => {
        await this._context.workspaceState.update(DEPTH_LIMIT_KEY, nextDepthLimit);
      },
      sendMessage: message => this._sendMessage(message as ExtensionToWebviewMessage),
      getActiveViewInfo: nextViewId => this._viewRegistry.get(nextViewId),
      applyViewTransform: () => this._applyViewTransform(),
      },
    );
  }

  /**
   * Gets the current depth limit.
   */
  public getDepthLimit(): number {
    return getGraphViewDepthLimit(this._viewContext, DEFAULT_DEPTH_LIMIT);
  }

  /**
   * Opens CodeGraphy in a main editor panel (alongside code tabs).
   * Creates a WebviewPanel in the active editor column.
   */
  public openInEditor(): void {
    openGraphViewInEditor({
      viewType: GraphViewProvider.viewType,
      extensionUri: this._extensionUri,
      getLocalResourceRoots: () => this._getLocalResourceRoots(),
      createPanel: (viewType, title, column, options) =>
        vscode.window.createWebviewPanel(viewType, title, column, options),
      setWebviewMessageListener: webview => this._setWebviewMessageListener(webview),
      getHtmlForWebview: webview => this._getHtmlForWebview(webview),
      registerPanel: panel => {
        this._panels.push(panel);
      },
      unregisterPanel: panel => {
        this._panels = this._panels.filter(existingPanel => existingPanel !== panel);
      },
    });
  }

  // ── Test helpers ─────────────────────────────────────────────────────────

  /**
   * Send an arbitrary message to all webviews (for e2e tests).
   * Mirrors what the extension sends, e.g. to simulate WEBVIEW_READY.
   */
  public sendToWebview(message: unknown): void {
    sendGraphViewWebviewMessage(this._view, this._panels, message);
  }

  /**
   * Register a handler for messages sent FROM the webview (for e2e tests).
   * Returns a disposable so tests can clean up.
   */
  public onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable {
    return onGraphViewWebviewMessage(this._view, handler);
  }

  /** Emit an event on the plugin EventBus (used by extension entry point). */
  public emitEvent<E extends EventName>(event: E, payload: EventPayloads[E]): void {
    this._eventBus.emit(event, payload);
  }

  /**
   * Sends a message to all active webviews (sidebar + editor panels).
   *
   * @param message - Message to send to the webviews
   */
  private _sendMessage(message: ExtensionToWebviewMessage): void {
    sendGraphViewWebviewMessage(this._view, this._panels, message);
  }

  /**
   * Sets up the message listener for webview-to-extension communication.
   * Handles all message types defined in WebviewToExtensionMessage.
   * 
   * @param webview - The webview to listen to
   */
  private _setWebviewMessageListener(webview: vscode.Webview): void {
    setGraphViewProviderMessageListener(
      webview,
      this as unknown as GraphViewProviderMessageListenerSource,
    );
  }

  /**
   * Opens a file in the VSCode editor.
   * Shows an info message for mock files that don't exist on disk.
   *
   * @param filePath - Workspace-relative path to the file
   */

  // ── Timeline methods ─────────────────────────────────────────────────────

  /**
   * Generates the HTML content for the webview.
   * Includes proper CSP headers and loads the React app bundle.
   * 
   * @param webview - The webview to generate HTML for
   * @returns Complete HTML document as a string
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    return createGraphViewHtml(this._extensionUri, webview, createGraphViewNonce());
  }
}
