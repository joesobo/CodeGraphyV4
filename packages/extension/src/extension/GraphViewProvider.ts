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
import { getUndoManager } from './UndoManager';
import {
  ToggleFavoriteAction,
  AddToExcludeAction,
  DeleteFilesAction,
  RenameFileAction,
  CreateFileAction,
  ResetSettingsAction,
} from './actions';
import { ViewRegistry, coreViews, IViewContext } from '../core/views';
import {
  applyGraphViewTransform,
  getRelativeWorkspacePath,
  mapAvailableViews,
} from './graphViewPresentation';
import {
  normalizeGraphViewExtensionUri,
} from './graphViewResources';
import { shouldRebuildGraphView } from './graphViewRebuild';
import { readGraphViewPhysicsSettings } from './graphViewPhysics';
import { createGraphViewHtml, createGraphViewNonce } from './graphViewHtml';
import { applyGraphViewAllSettingsSnapshot } from './graphView/allSettingsSync';
import {
  executeGraphViewAnalysis,
  type GraphViewAnalysisExecutionState,
} from './graphView/analysisExecution';
import { runGraphViewAnalysisRequest } from './graphView/analysisRequest';
import { loadGraphViewFileInfo } from './graphView/fileInfo';
import {
  sendGraphViewFavorites,
  toggleGraphViewFavorites,
} from './graphView/favorites';
import {
  registerGraphViewExternalPlugin,
  type GraphViewExternalPluginRegistrationOptions,
} from './graphView/externalPluginRegistration';
import {
  addGraphViewExcludePatterns,
  createGraphViewFile,
  deleteGraphViewFiles,
} from './graphView/fileActions';
import {
  copyGraphViewTextToClipboard,
  openGraphViewFile,
  revealGraphViewFileInExplorer,
} from './graphView/fileNavigation';
import { renameGraphViewFile } from './graphView/fileRename';
import { applyLoadedGraphViewGroupState } from './graphView/groupSync';
import {
  buildGraphViewGroupsUpdatedMessage,
  loadGraphViewGroupState,
} from './graphView/groups';
import {
  buildGraphViewSettingsMessages,
  captureGraphViewSettingsSnapshot,
} from './graphView/settings';
import {
  incrementPersistedGraphViewVisitCount,
  readPersistedGraphViewVisitCount,
} from './graphView/visits';
import { buildGraphViewTimelineGraphData } from './graphView/timelineGraph';
import {
  openGraphViewNodeInEditor,
  previewGraphViewFileAtCommit,
} from './graphView/timelineOpen';
import {
  invalidateGraphViewTimelineCache,
  sendCachedGraphViewTimeline,
  sendGraphViewPlaybackSpeed,
} from './graphView/timelinePlayback';
import { indexGraphViewRepository } from './graphView/timelineIndex';
import {
  getGraphViewWebviewResourceRoots,
  refreshGraphViewResourceRoots,
  resolveGraphViewPluginAssetPath,
  sendGraphViewContextMenuItems,
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
  sendGraphViewPluginWebviewInjections,
} from './graphView/pluginWebview';
import {
	getGraphViewConfigTarget,
	normalizeFolderNodeColor,
	readGraphViewSettings,
	resolveGraphViewDisabledState,
} from './graphViewSettings';
import { setGraphViewWebviewMessageListener } from './graphView/messages/listener';

/** Default physics settings (user-facing normalized values) */
const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 0.15,
  damping: 0.7,
  centerForce: 0.1,
};

/** Storage key for selected view per workspace */
const SELECTED_VIEW_KEY = 'codegraphy.selectedView';

/** Storage key for depth limit per workspace */
const DEPTH_LIMIT_KEY = 'codegraphy.depthLimit';

/** Storage key for DAG layout mode per workspace */
const DAG_MODE_KEY = 'codegraphy.dagMode';

/** Storage key for node size mode per workspace */
const NODE_SIZE_MODE_KEY = 'codegraphy.nodeSizeMode';

/** Storage key for disabled rules in workspace state */
const DISABLED_RULES_KEY = 'codegraphy.disabledRules';

/** Storage key for disabled plugins in workspace state */
const DISABLED_PLUGINS_KEY = 'codegraphy.disabledPlugins';

/** Default depth limit for depth graph view */
const DEFAULT_DEPTH_LIMIT = 1;

type EditorOpenBehavior = Pick<vscode.TextDocumentShowOptions, 'preview' | 'preserveFocus'>;

const TEMPORARY_NODE_OPEN_BEHAVIOR: EditorOpenBehavior = {
  preview: true,
  preserveFocus: true,
};

const PERMANENT_NODE_OPEN_BEHAVIOR: EditorOpenBehavior = {
  preview: false,
  preserveFocus: false,
};

const DEFAULT_TIMELINE_PREVIEW_BEHAVIOR: EditorOpenBehavior = {
  preview: true,
  preserveFocus: false,
};

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
  private _analyzerInitialized = false;

  /** In-flight analyzer initialization promise (deduplicates concurrent starts). */
  private _analyzerInitPromise?: Promise<void>;

  /** Abort controller for the currently running analysis (if any). */
  private _analysisController?: AbortController;

  /** Monotonic analysis request counter; latest request wins. */
  private _analysisRequestId = 0;

  /** View registry for managing available views */
  private readonly _viewRegistry: ViewRegistry;

  /** Currently active view ID */
  private _activeViewId: string;

  /** Current DAG layout mode (null = free-form physics) */
  private _dagMode: DagMode = null;

  /** Current node size mode */
  private _nodeSizeMode: NodeSizeMode = 'connections';

  /** Raw (untransformed) graph data from analysis */
  private _rawGraphData: IGraphData = { nodes: [], edges: [] };

  /** Current view context */
  private _viewContext: IViewContext = {
    activePlugins: new Set(),
    depthLimit: DEFAULT_DEPTH_LIMIT,
  };

  /** Groups for client-side file coloring (computed merged result) */
  private _groups: IGroup[] = [];

  /** User-defined groups (persisted to settings.json) */
  private _userGroups: IGroup[] = [];

  /** Plugin default group IDs that the user has hidden */
  private _hiddenPluginGroupIds = new Set<string>();

  /** Filter patterns passed to analysis (extension-side exclusions) */
  private _filterPatterns: string[] = [];

  /** Disabled rule qualified IDs (e.g., "codegraphy.typescript:es6-import") */
  private _disabledRules: Set<string> = new Set();

  /** Disabled plugin IDs (e.g., "codegraphy.typescript") */
  private _disabledPlugins: Set<string> = new Set();

  /** Git history analyzer for timeline feature */
  private _gitAnalyzer?: GitHistoryAnalyzer;

  /** SHA of the currently displayed commit */
  private _currentCommitSha?: string;

  /** Whether the timeline mode is active */
  private _timelineActive = false;

  /** EventBus for plugin event system */
  private _eventBus: EventBus;

  /** DecorationManager for plugin decorations */
  private _decorationManager: DecorationManager;

  /** Whether this is the first analysis (for notifyWorkspaceReady) */
  private _firstAnalysis = true;

  /** Resolves when first workspace-ready lifecycle dispatch has occurred. */
  private _resolveFirstWorkspaceReady?: () => void;

  /** Promise that settles when first workspace-ready lifecycle dispatch has occurred. */
  private readonly _firstWorkspaceReadyPromise: Promise<void>;

  /** Whether webview-ready lifecycle has already fired. */
  private _webviewReadyNotified = false;

  /** Abort controller for timeline indexing */
  private _indexingController?: AbortController;

  /** Source extension roots for externally registered plugins (Tier-2 assets). */
  private readonly _pluginExtensionUris = new Map<string, vscode.Uri>();

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

    // Initialize view registry with core views
    this._viewRegistry = new ViewRegistry();
    for (const view of coreViews) {
      this._viewRegistry.register(view, { core: true, isDefault: view.id === 'codegraphy.connections' });
    }

    // Initialize v2 plugin subsystems
    this._eventBus = new EventBus();
    this._decorationManager = new DecorationManager();

    // Wire the event bus into the analyzer for analysis lifecycle events
    this._analyzer.setEventBus(this._eventBus);

    // Configure plugin registry for v2
    this._analyzer.registry.configureV2({
      eventBus: this._eventBus,
      decorationManager: this._decorationManager,
      viewRegistry: this._viewRegistry,
      graphProvider: () => this._graphData,
      commandRegistrar: (id, action) => {
        const disposable = vscode.commands.registerCommand(id, action);
        this._context.subscriptions.push(disposable);
        return disposable;
      },
      webviewSender: (msg) => this._sendMessage(msg as ExtensionToWebviewMessage),
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
    });

    // Forward decoration changes to webview
    this._decorationManager.onDecorationsChanged(() => {
      this._sendDecorations();
    });

    // Restore selected view from workspace state, or use default
    const savedViewId = this._context.workspaceState.get<string>(SELECTED_VIEW_KEY);
    this._activeViewId = savedViewId && this._viewRegistry.get(savedViewId)
      ? savedViewId
      : this._viewRegistry.getDefaultViewId() ?? 'codegraphy.connections';

    // Restore DAG mode from workspace state
    this._dagMode = this._context.workspaceState.get<DagMode>(DAG_MODE_KEY) ?? null;

    // Restore node size mode from workspace state
    this._nodeSizeMode = this._context.workspaceState.get<NodeSizeMode>(NODE_SIZE_MODE_KEY) ?? 'connections';

    this._loadDisabledRulesAndPlugins();
  }

  /**
   * Gets the view registry for external access (e.g., plugin registration).
   */
  public get viewRegistry(): ViewRegistry {
    return this._viewRegistry;
  }

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

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: this._getLocalResourceRoots(),
    };

    // Set up message listener BEFORE loading HTML to avoid race condition
    this._setWebviewMessageListener(webviewView.webview);

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Set context for keybindings - initial state
    void vscode.commands.executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

    // Listen for visibility changes (e.g., switching between views)
    // When view becomes visible again, re-send the graph data
    webviewView.onDidChangeVisibility(() => {
      // Update keybinding context
      void vscode.commands.executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

      if (webviewView.visible) {
        console.log('[CodeGraphy] View became visible, re-sending data');
        void this._analyzeAndSendData();
      }
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
   * Re-analyzes the workspace and updates the graph.
   * Can be called when files change or settings are updated.
   */
  public async refresh(): Promise<void> {
    this._loadDisabledRulesAndPlugins();
    await this._analyzeAndSendData();
    this._sendSettings();
    this._sendPhysicsSettings();
  }

  /**
   * Sends physics settings to the webview without re-analyzing.
   * Used when only physics settings change (not file/graph changes).
   */
  public refreshPhysicsSettings(): void {
    this._sendPhysicsSettings();
  }

  /**
   * Sends display settings (arrows, labels, bidirectional, etc.) to the webview
   * without re-analyzing the workspace. Used for display-only config changes.
   */
  public refreshSettings(): void {
    this._sendSettings();
  }

  /**
   * Refreshes rule/plugin toggle state from VS Code settings and updates the graph.
   * Used when users edit disabled toggles directly in settings JSON.
   */
  public refreshToggleSettings(): void {
    if (!this._loadDisabledRulesAndPlugins()) return;
    this._rebuildAndSend();
  }

  /**
   * Clears the analysis cache and re-analyzes.
   */
  public async clearCacheAndRefresh(): Promise<void> {
    this._analyzer?.clearCache();
    await this._analyzeAndSendData();
  }

  /**
   * Analyzes the workspace and sends data to webview.
   */
  private async _analyzeAndSendData(): Promise<void> {
    const state = {
      analysisController: this._analysisController,
      analysisRequestId: this._analysisRequestId,
    };

    await runGraphViewAnalysisRequest(state, {
      executeAnalysis: (signal, requestId) => this._doAnalyzeAndSendData(signal, requestId),
      isAbortError: error => this._isAbortError(error),
      logError: (message, error) => {
        console.error(message, error);
      },
      updateAnalysisController: controller => {
        this._analysisController = controller;
      },
      updateAnalysisRequestId: requestId => {
        this._analysisRequestId = requestId;
      },
    });

    this._analysisController = state.analysisController;
    this._analysisRequestId = state.analysisRequestId;
  }

  private async _doAnalyzeAndSendData(signal: AbortSignal, requestId: number): Promise<void> {
    const state: GraphViewAnalysisExecutionState = {
      analyzer: this._analyzer,
      analyzerInitialized: this._analyzerInitialized,
      analyzerInitPromise: this._analyzerInitPromise,
      filterPatterns: this._filterPatterns,
      disabledRules: this._disabledRules,
      disabledPlugins: this._disabledPlugins,
    };

    await executeGraphViewAnalysis(signal, requestId, state, {
      isAnalysisStale: (nextSignal, nextRequestId) =>
        this._isAnalysisStale(nextSignal, nextRequestId),
      hasWorkspace: () => (vscode.workspace.workspaceFolders?.length ?? 0) > 0,
      setRawGraphData: graphData => {
        this._rawGraphData = graphData;
      },
      setGraphData: graphData => {
        this._graphData = graphData;
      },
      getGraphData: () => this._graphData,
      sendGraphDataUpdated: graphData => {
        this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: graphData });
      },
      sendAvailableViews: () => this._sendAvailableViews(),
      computeMergedGroups: () => this._computeMergedGroups(),
      sendGroupsUpdated: () => this._sendGroupsUpdated(),
      updateViewContext: () => this._updateViewContext(),
      applyViewTransform: () => this._applyViewTransform(),
      sendPluginStatuses: () => this._sendPluginStatuses(),
      sendDecorations: () => this._sendDecorations(),
      sendContextMenuItems: () => this._sendContextMenuItems(),
      markWorkspaceReady: graphData => this._markWorkspaceReady(graphData),
      isAbortError: error => this._isAbortError(error),
      logError: (message, error) => {
        console.error(message, error);
      },
    });

    this._analyzerInitialized = state.analyzerInitialized;
    this._analyzerInitPromise = state.analyzerInitPromise;
  }

  /**
   * Marks first workspace-ready lifecycle as complete and resolves waiters.
   */
  private _markWorkspaceReady(graph: IGraphData): void {
    if (!this._firstAnalysis) return;
    this._firstAnalysis = false;
    this._analyzer?.registry.notifyWorkspaceReady(graph);
    this._resolveFirstWorkspaceReady?.();
    this._resolveFirstWorkspaceReady = undefined;
  }

  private _isAnalysisStale(signal: AbortSignal, requestId: number): boolean {
    return signal.aborted || requestId !== this._analysisRequestId;
  }

  private _isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  /** Map of built-in plugin IDs to their package directory names. */
  private static readonly _builtInPluginDirs: Record<string, string> = {
    'codegraphy.typescript': 'plugin-typescript',
    'codegraphy.gdscript': 'plugin-godot',
    'codegraphy.python': 'plugin-python',
    'codegraphy.csharp': 'plugin-csharp',
    'codegraphy.markdown': 'plugin-markdown',
  };

  /** Built-in default groups for common file types (independent of plugins). */
  private static readonly _builtInDefaultGroups: Array<{ pattern: string; color: string }> = [
    { pattern: '.gitignore', color: '#F97583' },
    { pattern: '*.json', color: '#F9C74F' },
    { pattern: '*.png', color: '#90BE6D' },
    { pattern: '*.jpg', color: '#90BE6D' },
    { pattern: '*.svg', color: '#43AA8B' },
    { pattern: '*.md', color: '#577590' },
    { pattern: '*.jpeg', color: '#90BE6D' },
    { pattern: '.vscode/settings.json', color: '#277ACC' },
  ];

  /**
   * Eagerly registers built-in plugin asset roots so that plugin image paths
   * always resolve correctly regardless of analyzer timing.
   */
  private _registerBuiltInPluginRoots(): void {
    for (const [pluginId, dirName] of Object.entries(GraphViewProvider._builtInPluginDirs)) {
      if (!this._pluginExtensionUris.has(pluginId)) {
        this._pluginExtensionUris.set(
          pluginId,
          vscode.Uri.joinPath(this._extensionUri, 'packages', dirName)
        );
      }
    }
  }

  /**
   * Returns plugin-provided default file color groups.
   * Group IDs are deterministic: plugin:<pluginId>:<pattern>
   * Sets isPluginDefault: true on each group.
   * Does NOT modify this._groups — caller is responsible for merging.
   */
  private _getPluginDefaultGroups(): IGroup[] {
    if (!this._analyzer) return [];

    const result: IGroup[] = [];
    const addedIds = new Set<string>();

    for (const pluginInfo of this._analyzer.registry.list()) {
      // Skip disabled plugins entirely — they shouldn't show up in the groups panel
      if (this._disabledPlugins.has(pluginInfo.plugin.id)) continue;

      const fileColors = pluginInfo.plugin.fileColors;
      if (!fileColors) continue;

      // Ensure built-in plugins have their package root registered for asset resolution
      const pluginId = pluginInfo.plugin.id;
      if (pluginInfo.builtIn && !this._pluginExtensionUris.has(pluginId)) {
        const dirName = GraphViewProvider._builtInPluginDirs[pluginId];
        if (dirName) {
          this._pluginExtensionUris.set(
            pluginId,
            vscode.Uri.joinPath(this._extensionUri, 'packages', dirName)
          );
        }
      }

      for (const [pattern, value] of Object.entries(fileColors)) {
        const color = typeof value === 'string' ? value : value.color;
        const id = `plugin:${pluginId}:${pattern}`;
        if (addedIds.has(id)) continue;
        const group: IGroup = { id, pattern, color, isPluginDefault: true, pluginName: pluginInfo.plugin.name };
        if (typeof value === 'object') {
          if (value.shape2D) group.shape2D = value.shape2D;
          if (value.shape3D) group.shape3D = value.shape3D;
          if (value.image) {
            group.imagePath = value.image;
          }
        }
        result.push(group);
        addedIds.add(id);
      }
    }

    return result;
  }

  /** Returns built-in default groups (common file types, independent of plugins). */
  private _getBuiltInDefaultGroups(): IGroup[] {
    return GraphViewProvider._builtInDefaultGroups.map(({ pattern, color }) => ({
      id: `default:${pattern}`,
      pattern,
      color,
      isPluginDefault: true,
      pluginName: 'CodeGraphy',
    }));
  }

  /**
   * Computes the merged groups list: user groups + built-in defaults + plugin defaults.
   * Disabled groups are marked but still included (visible in settings).
   */
  private _computeMergedGroups(): void {
    const applyDisabledState = (g: IGroup): IGroup => {
      // Section key is everything before the last colon:
      // "default:*.json" → "default", "plugin:codegraphy.csharp:*.cs" → "plugin:codegraphy.csharp"
      const lastColon = g.id.lastIndexOf(':');
      const sectionKey = lastColon > 0 ? g.id.slice(0, lastColon) : undefined;
      const isDisabled = this._hiddenPluginGroupIds.has(g.id)
        || (sectionKey !== undefined && this._hiddenPluginGroupIds.has(sectionKey));
      return { ...g, disabled: isDisabled || undefined };
    };

    const builtInDefaults = this._getBuiltInDefaultGroups().map(applyDisabledState);
    const pluginDefaults = this._getPluginDefaultGroups().map(applyDisabledState);
    this._groups = [...this._userGroups, ...builtInDefaults, ...pluginDefaults];
  }

  /**
   * Updates the view context with current state.
   */
  private _updateViewContext(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const activeEditor = vscode.window.activeTextEditor;
    const savedDepthLimit = this._context.workspaceState.get<number>(DEPTH_LIMIT_KEY);
    const config = vscode.workspace.getConfiguration('codegraphy');

    this._viewContext = {
      activePlugins: this._getActivePluginIds(),
      workspaceRoot: workspaceFolder?.uri.fsPath,
      focusedFile: activeEditor ? this._getRelativePath(activeEditor.document.uri) : undefined,
      depthLimit: savedDepthLimit ?? DEFAULT_DEPTH_LIMIT,
      folderNodeColor: normalizeFolderNodeColor(config.get<string>('folderNodeColor', DEFAULT_FOLDER_NODE_COLOR)),
    };
  }

  /**
   * Gets the set of active plugin IDs from the plugin registry.
   */
  private _getActivePluginIds(): Set<string> {
    const plugins = new Set<string>();
    if (this._analyzer) {
      for (const info of this._analyzer.registry.list()) {
        if (info.plugin?.id) {
          plugins.add(info.plugin.id);
        }
      }
    }
    return plugins;
  }

  /**
   * Gets the workspace-relative path for a URI.
   */
  private _getRelativePath(uri: vscode.Uri): string | undefined {
    return getRelativeWorkspacePath(uri, vscode.workspace.workspaceFolders, vscode.workspace.asRelativePath);
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
   * Sends the list of available views to the webview.
   */
  private _sendAvailableViews(): void {
    const availableViews = this._viewRegistry.getAvailableViews(this._viewContext);
    const views = mapAvailableViews(availableViews, this._activeViewId);

    this._sendMessage({
      type: 'VIEWS_UPDATED',
      payload: { views, activeViewId: this._activeViewId },
    });
    
    // Also send current depth limit for depth graph view
    this._sendMessage({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: this._viewContext.depthLimit ?? DEFAULT_DEPTH_LIMIT },
    });
  }

  /**
   * Sends plugin statuses to the webview.
   */
  private _sendPluginStatuses(): void {
    sendGraphViewPluginStatuses(
      this._analyzer,
      this._disabledRules,
      this._disabledPlugins,
      (message) => this._sendMessage(message),
    );
  }

  /**
   * Sends merged decorations to the webview.
   */
  private _sendDecorations(): void {
    sendGraphViewDecorations(this._decorationManager, (message) => this._sendMessage(message));
  }

  /**
   * Sends plugin context menu items to the webview.
   */
  private _sendContextMenuItems(): void {
    sendGraphViewContextMenuItems(this._analyzer, (message) => this._sendMessage(message));
  }

  /**
   * Sends Tier-2 webview asset injections for plugins that declare contributions.
   */
  private _sendPluginWebviewInjections(): void {
    sendGraphViewPluginWebviewInjections(
      this._analyzer,
      (assetPath, pluginId) => this._resolveWebviewAssetPath(assetPath, pluginId),
      (message) => this._sendMessage(message),
    );
  }

  /**
   * Resolves an asset path for webview consumption.
   * Absolute URLs are passed through; relative/absolute file paths are converted
   * to webview URIs when possible.
   */
  private _resolveWebviewAssetPath(assetPath: string, pluginId?: string): string {
    return resolveGraphViewPluginAssetPath(
      assetPath,
      this._extensionUri,
      this._pluginExtensionUris,
      this._view,
      this._panels,
      pluginId
    );
  }

  /**
   * Returns all local resource roots allowed for webviews.
   * Includes CodeGraphy and any externally-registered plugin extension roots.
   */
  private _getLocalResourceRoots(): vscode.Uri[] {
    return getGraphViewWebviewResourceRoots(
      this._extensionUri,
      this._pluginExtensionUris,
      vscode.workspace.workspaceFolders
    );
  }

  /**
   * Applies the current resource roots to all active webviews.
   */
  private _refreshWebviewResourceRoots(): void {
    refreshGraphViewResourceRoots(
      this._view,
      this._panels,
      this._getLocalResourceRoots(),
    );
  }

  /**
   * Normalizes an external plugin extension URI from API input.
   */
  private _normalizeExternalExtensionUri(uri: vscode.Uri | string | undefined): vscode.Uri | undefined {
    return normalizeGraphViewExtensionUri(uri);
  }

  /**
   * Rebuilds the graph from cached connections (no re-analysis) and sends updates.
   * Used for instant rule/plugin toggle response.
   */
  private _rebuildAndSend(): void {
    if (!this._analyzer) return;

    const showOrphans = vscode.workspace.getConfiguration('codegraphy').get<boolean>('showOrphans', true);

    this._rawGraphData = this._analyzer.rebuildGraph(this._disabledRules, this._disabledPlugins, showOrphans);
    this._updateViewContext();
    this._applyViewTransform();
    this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
    this._sendAvailableViews();
    this._sendPluginStatuses();
    this._sendDecorations();
    this._analyzer.registry.notifyGraphRebuild(this._graphData);
  }

  /**
   * Intelligently rebuilds graph only when the toggled rule/plugin has connections.
   * If the rule/plugin has 0 connections, only the plugin statuses are updated
   * since the graph wouldn't visually change.
   */
  private _smartRebuild(kind: 'rule' | 'plugin', id: string): void {
    if (!this._analyzer) return;

    const statuses = this._analyzer.getPluginStatuses(this._disabledRules, this._disabledPlugins);
    if (shouldRebuildGraphView(statuses, kind, id)) {
      this._rebuildAndSend();
    } else {
      // No connections affected — just update the toggle UI
      this._sendMessage({ type: 'PLUGINS_UPDATED', payload: { plugins: statuses } });
    }
  }

  /**
   * Changes the active view.
   * 
   * @param viewId - ID of the view to switch to
   */
  public async changeView(viewId: string): Promise<void> {
    if (!this._viewRegistry.isViewAvailable(viewId, this._viewContext)) {
      console.warn(`[CodeGraphy] View '${viewId}' is not available`);
      return;
    }
    
    this._activeViewId = viewId;
    await this._context.workspaceState.update(SELECTED_VIEW_KEY, viewId);
    
    // Re-apply view transform and send updates
    this._applyViewTransform();

    this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
    this._sendAvailableViews();
  }

  /**
   * Sets the focused file for view context (e.g., for Depth Graph).
   * 
   * @param filePath - Relative path to the focused file
   */
  public setFocusedFile(filePath: string | undefined): void {
    const previousFocusedFile = this._viewContext.focusedFile;
    this._viewContext.focusedFile = filePath;
    
    // Always update available views when focused file changes
    // (e.g., Depth Graph is only available when a file is focused)
    if (previousFocusedFile !== filePath) {
      this._sendAvailableViews();
    }
    
    // Re-apply transform if using a view that depends on focused file
    const viewInfo = this._viewRegistry.get(this._activeViewId);
    if (viewInfo?.view.id === 'codegraphy.depth-graph') {
      this._applyViewTransform();
  
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
    }
  }

  /**
   * Sets the depth limit for depth graph view.
   * 
   * @param depthLimit - Maximum number of hops from the focused node
   */
  public async setDepthLimit(depthLimit: number): Promise<void> {
    // Clamp to valid range (1-10)
    const clampedDepth = Math.max(1, Math.min(10, depthLimit));
    this._viewContext.depthLimit = clampedDepth;
    
    await this._context.workspaceState.update(DEPTH_LIMIT_KEY, clampedDepth);
    
    // Notify webview of the new depth limit
    this._sendMessage({ type: 'DEPTH_LIMIT_UPDATED', payload: { depthLimit: clampedDepth } });
    
    // Re-apply transform if using depth graph view
    const viewInfo = this._viewRegistry.get(this._activeViewId);
    if (viewInfo?.view.id === 'codegraphy.depth-graph') {
      this._applyViewTransform();
  
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
    }
  }

  /**
   * Gets the current depth limit.
   */
  public getDepthLimit(): number {
    return this._viewContext.depthLimit ?? DEFAULT_DEPTH_LIMIT;
  }

  /**
   * Send a command to the webview (for keyboard shortcuts)
   * 
   * @param command - The command to send (FIT_VIEW, ZOOM_IN, ZOOM_OUT)
   */
  public sendCommand(command: 'FIT_VIEW' | 'ZOOM_IN' | 'ZOOM_OUT' | 'CYCLE_VIEW' | 'CYCLE_LAYOUT' | 'TOGGLE_DIMENSION'): void {
    this._sendMessage({ type: command });
  }

  /**
   * Opens CodeGraphy in a main editor panel (alongside code tabs).
   * Creates a WebviewPanel in the active editor column.
   */
  public openInEditor(): void {
    const panel = vscode.window.createWebviewPanel(
      GraphViewProvider.viewType,
      'CodeGraphy',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: this._getLocalResourceRoots(),
        retainContextWhenHidden: true,
      }
    );

    panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'assets', 'icon.svg');

    // Set up message listener before loading HTML
    this._setWebviewMessageListener(panel.webview);

    panel.webview.html = this._getHtmlForWebview(panel.webview);

    // Track panel
    this._panels.push(panel);

    // Clean up when panel is closed
    panel.onDidDispose(() => {
      this._panels = this._panels.filter(existingPanel => existingPanel !== panel);
    });
  }

  // ── Test helpers ─────────────────────────────────────────────────────────

  /**
   * Send an arbitrary message to all webviews (for e2e tests).
   * Mirrors what the extension sends, e.g. to simulate WEBVIEW_READY.
   */
  public sendToWebview(message: unknown): void {
    this._view?.webview.postMessage(message);
    for (const panel of this._panels) {
      panel.webview.postMessage(message);
    }
  }

  /**
   * Register a handler for messages sent FROM the webview (for e2e tests).
   * Returns a disposable so tests can clean up.
   */
  public onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable {
    if (!this._view) {
      return { dispose: () => {} };
    }
    return this._view.webview.onDidReceiveMessage(handler);
  }

  /** Emit an event on the plugin EventBus (used by extension entry point). */
  public emitEvent<E extends EventName>(event: E, payload: EventPayloads[E]): void {
    this._eventBus.emit(event, payload);
  }

  /**
   * Registers an external v2 plugin.
   */
  public registerExternalPlugin(
    plugin: unknown,
    options?: GraphViewExternalPluginRegistrationOptions,
  ): void {
    registerGraphViewExternalPlugin(
      plugin,
      options,
      {
        analyzer: this._analyzer,
        pluginExtensionUris: this._pluginExtensionUris,
        firstAnalysis: this._firstAnalysis,
        webviewReadyNotified: this._webviewReadyNotified,
        analyzerInitialized: this._analyzerInitialized,
        analyzerInitPromise: this._analyzerInitPromise,
      },
      {
        normalizeExtensionUri: (uri) => this._normalizeExternalExtensionUri(uri),
        getWorkspaceRoot: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        refreshWebviewResourceRoots: () => this._refreshWebviewResourceRoots(),
        sendPluginStatuses: () => this._sendPluginStatuses(),
        sendContextMenuItems: () => this._sendContextMenuItems(),
        sendPluginWebviewInjections: () => this._sendPluginWebviewInjections(),
        analyzeAndSendData: () => this._analyzeAndSendData(),
      },
    );
  }

  /**
   * Undoes the last action.
   * @returns Description of undone action, or undefined if nothing to undo
   */
  public async undo(): Promise<string | undefined> {
    return getUndoManager().undo();
  }

  /**
   * Redoes the last undone action.
   * @returns Description of redone action, or undefined if nothing to redo
   */
  public async redo(): Promise<string | undefined> {
    return getUndoManager().redo();
  }

  /**
   * Checks if undo is available.
   */
  public canUndo(): boolean {
    return getUndoManager().canUndo();
  }

  /**
   * Checks if redo is available.
   */
  public canRedo(): boolean {
    return getUndoManager().canRedo();
  }

  /**
   * Request the webview to export as PNG.
   */
  public requestExportPng(): void {
    this._sendMessage({ type: 'REQUEST_EXPORT_PNG' });
  }

  /**
   * Request the webview to export as SVG.
   */
  public requestExportSvg(): void {
    this._sendMessage({ type: 'REQUEST_EXPORT_SVG' });
  }

  /**
   * Request the webview to export as JPEG.
   */
  public requestExportJpeg(): void {
    this._sendMessage({ type: 'REQUEST_EXPORT_JPEG' });
  }

  /**
   * Request the webview to export connections as JSON.
   */
  public requestExportJson(): void {
    this._sendMessage({ type: 'REQUEST_EXPORT_JSON' });
  }

  /**
   * Request the webview to export connections as Markdown.
   */
  public requestExportMarkdown(): void {
    this._sendMessage({ type: 'REQUEST_EXPORT_MD' });
  }

  /**
   * Sends GROUPS_UPDATED with imagePath resolved to imageUrl.
   *
   * imagePath formats:
   * - Plugin groups (id starts with "plugin:"): relative to plugin root
   * - User groups with "plugin:<pluginId>:<path>": inherited from a plugin override,
   *   resolved via the named plugin root
   * - User groups with workspace-relative path (e.g. ".codegraphy/assets/icon.png"):
   *   resolved relative to the workspace folder
   */
  private _sendGroupsUpdated(): void {
    this._registerBuiltInPluginRoots();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const webview = this._view?.webview ?? this._panels[0]?.webview;
    this._sendMessage(
      buildGraphViewGroupsUpdatedMessage(this._groups, {
        workspaceFolder,
        asWebviewUri: webview ? (uri) => webview.asWebviewUri(uri) : undefined,
        resolvePluginAssetPath: (assetPath, pluginId) =>
          this._resolveWebviewAssetPath(assetPath, pluginId),
      }),
    );
  }

  /**
   * Sends a message to all active webviews (sidebar + editor panels).
   *
   * @param message - Message to send to the webviews
   */
  private _sendMessage(message: ExtensionToWebviewMessage): void {
    if (this._view) {
      void this._view.webview.postMessage(message);
    }
    for (const panel of this._panels) {
      void panel.webview.postMessage(message);
    }
  }

  /**
   * Sets up the message listener for webview-to-extension communication.
   * Handles all message types defined in WebviewToExtensionMessage.
   * 
   * @param webview - The webview to listen to
   */
  private _setWebviewMessageListener(webview: vscode.Webview): void {
    const config = vscode.workspace.getConfiguration('codegraphy');

    setGraphViewWebviewMessageListener(webview, {
      getTimelineActive: () => this._timelineActive,
      getCurrentCommitSha: () => this._currentCommitSha,
      getUserGroups: () => this._userGroups,
      getActiveViewId: () => this._activeViewId,
      getDisabledPlugins: () => this._disabledPlugins,
      getDisabledRules: () => this._disabledRules,
      getFilterPatterns: () => this._filterPatterns,
      getGraphData: () => this._graphData,
      getViewContext: () => this._viewContext,
      openSelectedNode: nodeId => this._openSelectedNode(nodeId),
      activateNode: nodeId => this._activateNode(nodeId),
      previewFileAtCommit: (sha, filePath) => this._previewFileAtCommit(sha, filePath),
      openFile: filePath => this._openFile(filePath),
      revealInExplorer: filePath => this._revealInExplorer(filePath),
      copyToClipboard: text => this._copyToClipboard(text),
      deleteFiles: paths => this._deleteFiles(paths),
      renameFile: filePath => this._renameFile(filePath),
      createFile: directory => this._createFile(directory),
      toggleFavorites: paths => this._toggleFavorites(paths),
      addToExclude: patterns => this._addToExclude(patterns),
      analyzeAndSendData: () => this._analyzeAndSendData(),
      getFileInfo: filePath => this._getFileInfo(filePath),
      undo: () => this.undo(),
      redo: () => this.redo(),
      showInformationMessage: detail => {
        vscode.window.showInformationMessage(detail);
      },
      changeView: viewId => this.changeView(viewId),
      setDepthLimit: depthLimit => this.setDepthLimit(depthLimit),
      updateDagMode: async dagMode => {
        this._dagMode = dagMode;
        await this._context.workspaceState.update(DAG_MODE_KEY, this._dagMode);
        this._sendMessage({ type: 'DAG_MODE_UPDATED', payload: { dagMode: this._dagMode } });
      },
      updateNodeSizeMode: async nodeSizeMode => {
        this._nodeSizeMode = nodeSizeMode;
        await this._context.workspaceState.update(NODE_SIZE_MODE_KEY, this._nodeSizeMode);
        this._sendMessage({
          type: 'NODE_SIZE_MODE_UPDATED',
          payload: { nodeSizeMode: this._nodeSizeMode },
        });
      },
      indexRepository: () => this._indexRepository(),
      jumpToCommit: sha => this._jumpToCommit(sha),
      sendPhysicsSettings: () => this._sendPhysicsSettings(),
      updatePhysicsSetting: (key, value) => this._updatePhysicsSetting(key, value),
      resetPhysicsSettings: () => this._resetPhysicsSettings(),
      workspaceFolder: vscode.workspace.workspaceFolders?.[0],
      persistGroups: async groups => {
        const target = getGraphViewConfigTarget(vscode.workspace.workspaceFolders);
        await vscode.workspace.getConfiguration('codegraphy').update('groups', groups, target);
      },
      recomputeGroups: () => this._computeMergedGroups(),
      sendGroupsUpdated: () => this._sendGroupsUpdated(),
      showOpenDialog: options => vscode.window.showOpenDialog(options),
      createDirectory: uri => vscode.workspace.fs.createDirectory(uri),
      copyFile: (source, destination, options) =>
        vscode.workspace.fs.copy(source, destination, options),
      getConfig: (key, defaultValue) =>
        vscode.workspace.getConfiguration('codegraphy').get(key, defaultValue),
      updateConfig: async (key, value) => {
        const target = getGraphViewConfigTarget(vscode.workspace.workspaceFolders);
        await vscode.workspace.getConfiguration('codegraphy').update(key, value, target);
      },
      getPluginFilterPatterns: () => this._analyzer?.getPluginFilterPatterns() ?? [],
      sendMessage: nextMessage => this._sendMessage(nextMessage as ExtensionToWebviewMessage),
      applyViewTransform: () => this._applyViewTransform(),
      smartRebuild: (kind, id) => this._smartRebuild(kind, id),
      resetAllSettings: async () => {
        const snapshot = captureGraphViewSettingsSnapshot(
          vscode.workspace.getConfiguration('codegraphy'),
          this._getPhysicsSettings(),
          this._nodeSizeMode,
        );
        const action = new ResetSettingsAction(
          snapshot,
          getGraphViewConfigTarget(vscode.workspace.workspaceFolders),
          this._context,
          () => this._sendAllSettings(),
          mode => {
            this._nodeSizeMode = mode;
          },
          () => this._analyzeAndSendData(),
        );
        await getUndoManager().execute(action);
      },
      getMaxFiles: () => config.get<number>('maxFiles', 500),
      getPlaybackSpeed: () => config.get<number>('timeline.playbackSpeed', 1.0),
      getDagMode: () => this._dagMode,
      getNodeSizeMode: () => this._nodeSizeMode,
      getFolderNodeColor: () =>
        normalizeFolderNodeColor(config.get<string>('folderNodeColor', DEFAULT_FOLDER_NODE_COLOR)),
      hasWorkspace: () => (vscode.workspace.workspaceFolders?.length ?? 0) > 0,
      isFirstAnalysis: () => this._firstAnalysis,
      isWebviewReadyNotified: () => this._webviewReadyNotified,
      getHiddenPluginGroupIds: () => this._hiddenPluginGroupIds,
      loadGroupsAndFilterPatterns: () => this._loadGroupsAndFilterPatterns(),
      loadDisabledRulesAndPlugins: () => this._loadDisabledRulesAndPlugins(),
      sendFavorites: () => this._sendFavorites(),
      sendSettings: () => this._sendSettings(),
      sendCachedTimeline: () => this._sendCachedTimeline(),
      sendDecorations: () => this._sendDecorations(),
      sendContextMenuItems: () => this._sendContextMenuItems(),
      sendPluginWebviewInjections: () => this._sendPluginWebviewInjections(),
      waitForFirstWorkspaceReady: () => this._firstWorkspaceReadyPromise,
      notifyWebviewReady: () => this._analyzer?.registry.notifyWebviewReady(),
      getInteractionPluginApi: pluginId => this._analyzer?.registry.getPluginAPI(pluginId),
      getContextMenuPluginApi: pluginId => this._analyzer?.registry.getPluginAPI(pluginId),
      emitEvent: (event, payload) => {
        this._eventBus.emit(event as EventName, payload as EventPayloads[EventName]);
      },
      findNode: targetId => this._graphData.nodes.find(node => node.id === targetId),
      findEdge: targetId => this._graphData.edges.find(edge => edge.id === targetId),
      logError: (label, error) => {
        console.error(label, error);
      },
      updateHiddenPluginGroups: groupIds => {
        const target = getGraphViewConfigTarget(vscode.workspace.workspaceFolders);
        return Promise.resolve(
          vscode.workspace.getConfiguration('codegraphy').update(
            'hiddenPluginGroups',
            groupIds,
            target,
          ),
        );
      },
      setUserGroups: groups => {
        this._userGroups = groups;
      },
      setFilterPatterns: patterns => {
        this._filterPatterns = patterns;
      },
      setWebviewReadyNotified: readyNotified => {
        this._webviewReadyNotified = readyNotified;
      },
    });
  }

  /**
   * Opens a file in the VSCode editor.
   * Shows an info message for mock files that don't exist on disk.
   *
   * @param filePath - Workspace-relative path to the file
   */

  // ── Timeline methods ─────────────────────────────────────────────────────

  /**
   * Indexes the git repository history and enables the timeline.
   */
  private async _indexRepository(): Promise<void> {
    const state = {
      analyzer: this._analyzer,
      analyzerInitialized: this._analyzerInitialized,
      gitAnalyzer: this._gitAnalyzer,
      indexingController: this._indexingController,
      filterPatterns: this._filterPatterns,
      timelineActive: this._timelineActive,
      currentCommitSha: this._currentCommitSha,
    };

    await indexGraphViewRepository(state, {
      workspaceFolder: vscode.workspace.workspaceFolders?.[0],
      verifyGitRepository: async cwd => {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);
        await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd });
      },
      createGitAnalyzer: (workspaceRoot, mergedExclude) =>
        new GitHistoryAnalyzer(
          this._context,
          this._analyzer!.registry,
          workspaceRoot,
          mergedExclude,
        ),
      getMaxCommits: () =>
        vscode.workspace.getConfiguration('codegraphy').get<number>('timeline.maxCommits', 500),
      sendMessage: message => this._sendMessage(message),
      showErrorMessage: message => {
        vscode.window.showErrorMessage(message);
      },
      showInformationMessage: message => {
        vscode.window.showInformationMessage(message);
      },
      toErrorMessage,
      jumpToCommit: sha => this._jumpToCommit(sha),
      logError: (message, error) => {
        console.error(message, error);
      },
    });

    this._analyzerInitialized = state.analyzerInitialized;
    this._gitAnalyzer = state.gitAnalyzer;
    this._indexingController = state.indexingController;
    this._timelineActive = state.timelineActive ?? this._timelineActive;
    this._currentCommitSha = state.currentCommitSha;
  }

  /**
   * Loads graph data for a specific commit and sends it to the webview.
   */
  private async _jumpToCommit(sha: string): Promise<void> {
    if (!this._gitAnalyzer) return;

    const rawGraphData = await this._gitAnalyzer.getGraphDataForCommit(sha);
    this._currentCommitSha = sha;
    const graphData = buildGraphViewTimelineGraphData(rawGraphData, {
      disabledPlugins: this._disabledPlugins,
      disabledRules: this._disabledRules,
      showOrphans: vscode.workspace.getConfiguration('codegraphy').get<boolean>('showOrphans', true),
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      registry: this._analyzer?.registry,
    });
    this._graphData = graphData;

    this._sendMessage({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha, graphData },
    });
  }

  // Playback is now driven entirely by the webview's requestAnimationFrame loop.
  // The webview sends JUMP_TO_COMMIT messages when the smooth time cursor
  // crosses commit boundaries.

  private async _openSelectedNode(nodeId: string): Promise<void> {
    await this._openNodeInEditor(nodeId, TEMPORARY_NODE_OPEN_BEHAVIOR);
  }

  private async _activateNode(nodeId: string): Promise<void> {
    await this._openNodeInEditor(nodeId, PERMANENT_NODE_OPEN_BEHAVIOR);
  }

  private async _openNodeInEditor(nodeId: string, behavior: EditorOpenBehavior): Promise<void> {
    await openGraphViewNodeInEditor(
      nodeId,
      {
        timelineActive: this._timelineActive,
        currentCommitSha: this._currentCommitSha,
      },
      {
        previewFileAtCommit: (sha, filePath, nextBehavior) =>
          this._previewFileAtCommit(sha, filePath, nextBehavior),
        openFile: (filePath, nextBehavior) => this._openFile(filePath, nextBehavior),
      },
      behavior,
    );
  }

  /**
   * Opens a file at a specific commit with the requested editor behavior.
   */
  private async _previewFileAtCommit(
    sha: string,
    filePath: string,
    behavior: EditorOpenBehavior = DEFAULT_TIMELINE_PREVIEW_BEHAVIOR
  ): Promise<void> {
    await previewGraphViewFileAtCommit(
      sha,
      filePath,
      {
        workspaceFolder: vscode.workspace.workspaceFolders?.[0],
        openTextDocument: (fileUri) => vscode.workspace.openTextDocument(fileUri),
        showTextDocument: (document, nextBehavior) =>
          vscode.window.showTextDocument(document, nextBehavior),
        logError: (label, error) => {
          console.error(label, error);
        },
      },
      behavior,
    );
  }

  /**
   * Sends cached timeline data to the webview (called on WEBVIEW_READY).
   */
  private _sendCachedTimeline(): void {
    const state = {
      timelineActive: this._timelineActive,
      currentCommitSha: this._currentCommitSha,
    };
    sendCachedGraphViewTimeline(
      this._gitAnalyzer,
      state,
      (message) => this._sendMessage(message),
    );
    this._timelineActive = state.timelineActive;
    this._currentCommitSha = state.currentCommitSha;
  }

  /**
   * Sends the current playback speed setting to the webview.
   */
  public sendPlaybackSpeed(): void {
    sendGraphViewPlaybackSpeed(
      vscode.workspace.getConfiguration('codegraphy').get<number>('timeline.playbackSpeed', 1.0),
      (message) => this._sendMessage(message),
    );
  }

  /**
   * Invalidates the timeline cache and notifies the webview.
   */
  public async invalidateTimelineCache(): Promise<void> {
    const state = {
      timelineActive: this._timelineActive,
      currentCommitSha: this._currentCommitSha,
    };
    const nextGitAnalyzer = await invalidateGraphViewTimelineCache(
      this._gitAnalyzer,
      state,
      (message) => this._sendMessage(message),
    );
    this._timelineActive = state.timelineActive;
    this._currentCommitSha = state.currentCommitSha;
    this._gitAnalyzer = nextGitAnalyzer;
  }

  private async _openFile(
    filePath: string,
    behavior: EditorOpenBehavior = PERMANENT_NODE_OPEN_BEHAVIOR
  ): Promise<void> {
    await openGraphViewFile(
      filePath,
      {
        workspaceFolder: vscode.workspace.workspaceFolders?.[0],
        showInformationMessage: (message) => {
          vscode.window.showInformationMessage(message);
        },
        showErrorMessage: (message) => {
          vscode.window.showErrorMessage(message);
        },
        statFile: (fileUri) => vscode.workspace.fs.stat(fileUri),
        openTextDocument: (fileUri) => vscode.workspace.openTextDocument(fileUri),
        showTextDocument: (document, nextBehavior) =>
          vscode.window.showTextDocument(document, nextBehavior),
        incrementVisitCount: (nextFilePath) => this._incrementVisitCount(nextFilePath),
        logError: (label, error) => {
          console.error(label, error);
        },
      },
      behavior,
    );
  }

  /**
   * Reveals a file in the VSCode explorer sidebar.
   */
  private async _revealInExplorer(filePath: string): Promise<void> {
    await revealGraphViewFileInExplorer(filePath, {
      workspaceFolder: vscode.workspace.workspaceFolders?.[0],
      executeCommand: (command, ...args) => vscode.commands.executeCommand(command, ...args),
    });
  }

  /**
   * Copies text to the clipboard.
   */
  private async _copyToClipboard(text: string): Promise<void> {
    await copyGraphViewTextToClipboard(text, {
      workspaceFolder: vscode.workspace.workspaceFolders?.[0],
      writeText: (value) => vscode.env.clipboard.writeText(value),
    });
  }

  /**
   * Deletes files with confirmation (with undo support).
   */
  private async _deleteFiles(paths: string[]): Promise<void> {
    await deleteGraphViewFiles(paths, {
      workspaceFolder: vscode.workspace.workspaceFolders?.[0],
      showWarningMessage: (message, options, deleteAction) =>
        vscode.window.showWarningMessage(message, options, deleteAction),
      executeDeleteAction: async (nextPaths, workspaceFolderUri) => {
        const action = new DeleteFilesAction(
          nextPaths,
          workspaceFolderUri,
          () => this._analyzeAndSendData(),
        );
        await getUndoManager().execute(action);
      },
    });
  }

  /**
   * Renames a file with an input dialog (with undo support).
   */
  private async _renameFile(filePath: string): Promise<void> {
    await renameGraphViewFile(filePath, {
      workspaceFolder: vscode.workspace.workspaceFolders?.[0],
      showInputBox: (options) => vscode.window.showInputBox(options),
      executeRenameAction: async (oldPath, newPath, workspaceFolderUri) => {
        const action = new RenameFileAction(
          oldPath,
          newPath,
          workspaceFolderUri,
          () => this._analyzeAndSendData(),
        );
        await getUndoManager().execute(action);
      },
      showErrorMessage: (message) => {
        vscode.window.showErrorMessage(message);
      },
    });
  }

  /**
   * Creates a new file in the workspace (with undo support).
   */
  private async _createFile(directory: string): Promise<void> {
    await createGraphViewFile(directory, {
      workspaceFolder: vscode.workspace.workspaceFolders?.[0],
      showInputBox: (options) => vscode.window.showInputBox(options),
      executeCreateAction: async (filePath, workspaceFolderUri) => {
        const action = new CreateFileAction(
          filePath,
          workspaceFolderUri,
          () => this._analyzeAndSendData(),
        );
        await getUndoManager().execute(action);
      },
      showErrorMessage: (message) => {
        vscode.window.showErrorMessage(message);
      },
    });
  }

  /**
   * Toggles favorite status for files (with undo support).
   */
  private async _toggleFavorites(paths: string[]): Promise<void> {
    await toggleGraphViewFavorites(paths, {
      executeToggleFavoritesAction: async (nextPaths) => {
        const action = new ToggleFavoriteAction(nextPaths, () => this._sendFavorites());
        await getUndoManager().execute(action);
      },
    });
  }

  /**
   * Loads groups and filter patterns with VS Code settings taking priority over workspace state.
   * User groups are stored in settings.json; plugin default groups are computed dynamically.
   * Falls back to workspaceState for migration from older persisted data.
   */
  private _loadGroupsAndFilterPatterns(): void {
    const config = vscode.workspace.getConfiguration('codegraphy');
    const groupState = loadGraphViewGroupState(config, this._context.workspaceState);
    const state = {
      userGroups: this._userGroups,
      hiddenPluginGroupIds: this._hiddenPluginGroupIds,
      filterPatterns: this._filterPatterns,
    };
    applyLoadedGraphViewGroupState(groupState, state, {
      recomputeGroups: () => this._computeMergedGroups(),
      persistLegacyGroups: (groups) => {
        const target = getGraphViewConfigTarget(vscode.workspace.workspaceFolders);
        void vscode.workspace.getConfiguration('codegraphy').update('groups', groups, target);
      },
      clearLegacyGroups: () => {
        void this._context.workspaceState.update('codegraphy.groups', undefined);
      },
    });
    this._userGroups = state.userGroups;
    this._hiddenPluginGroupIds = state.hiddenPluginGroupIds;
    this._filterPatterns = state.filterPatterns;
  }

  /**
   * Loads disabled rule/plugin toggles from VS Code settings.
   * Falls back to workspace state for migration from older persisted data.
   *
   * @returns True when either disabled set changed
   */
  private _loadDisabledRulesAndPlugins(): boolean {
    const config = vscode.workspace.getConfiguration('codegraphy');
    const rulesInspect = config.inspect<string[]>('disabledRules');
    const pluginsInspect = config.inspect<string[]>('disabledPlugins');
    const disabledState = resolveGraphViewDisabledState(
      this._disabledRules,
      this._disabledPlugins,
      rulesInspect?.workspaceValue ?? rulesInspect?.globalValue,
      pluginsInspect?.workspaceValue ?? pluginsInspect?.globalValue,
      this._context.workspaceState.get<string[]>(DISABLED_RULES_KEY),
      this._context.workspaceState.get<string[]>(DISABLED_PLUGINS_KEY)
    );

    this._disabledRules = disabledState.disabledRules;
    this._disabledPlugins = disabledState.disabledPlugins;

    return disabledState.changed;
  }

  /**
   * Sends current favorites to the webview.
   */
  private _sendFavorites(): void {
    sendGraphViewFavorites(
      vscode.workspace.getConfiguration('codegraphy'),
      (message) => this._sendMessage(message),
    );
  }

  /**
   * Sends current settings to the webview.
   */
  private _sendSettings(): void {
    const settings = readGraphViewSettings(vscode.workspace.getConfiguration('codegraphy'));
    this._viewContext.folderNodeColor = settings.folderNodeColor;
    for (const message of buildGraphViewSettingsMessages(settings)) {
      this._sendMessage(message);
    }
  }

  /**
   * Gets file info and sends it to the webview.
   */
  private async _getFileInfo(filePath: string): Promise<void> {
    try {
      const payload = await loadGraphViewFileInfo(filePath, {
        workspaceFolder: vscode.workspace.workspaceFolders?.[0],
        statFile: (fileUri) => vscode.workspace.fs.stat(fileUri),
        ensureAnalyzerReady: async () => {
          if (this._analyzer && !this._analyzerInitialized) {
            await this._analyzer.initialize();
            this._analyzerInitialized = true;
          }
          return this._analyzer;
        },
        graphData: this._graphData,
        getVisitCount: (nextFilePath) => this._getVisitCount(nextFilePath),
      });
      if (!payload) return;

      this._sendMessage({ type: 'FILE_INFO', payload });
    } catch (error) {
      console.error('[CodeGraphy] Failed to get file info:', error);
    }
  }

  /**
   * Gets the visit count for a file.
   */
  private _getVisitCount(filePath: string): number {
    return readPersistedGraphViewVisitCount(this._context.workspaceState, filePath);
  }

  /**
   * Increments the visit count for a file and notifies the webview.
   */
  private async _incrementVisitCount(filePath: string): Promise<void> {
    this._sendMessage(
      await incrementPersistedGraphViewVisitCount(this._context.workspaceState, filePath),
    );
  }

  /**
   * Tracks a file visit when opened through VS Code (external to CodeGraphy).
   * Called by the active text editor change listener.
   */
  public async trackFileVisit(filePath: string): Promise<void> {
    // Only track files that are in our graph
    const nodeExists = this._graphData.nodes.some(n => n.id === filePath);
    if (nodeExists) {
      await this._incrementVisitCount(filePath);
    }
  }

  /**
   * Adds patterns to the exclude list (with undo support).
   */
  private async _addToExclude(patterns: string[]): Promise<void> {
    await addGraphViewExcludePatterns(patterns, {
      executeAddToExcludeAction: async (nextPatterns) => {
        const action = new AddToExcludeAction(nextPatterns, () => this._analyzeAndSendData());
        await getUndoManager().execute(action);
      },
    });
  }

  /**
   * Gets the current physics settings from configuration.
   */
  private _getPhysicsSettings(): IPhysicsSettings {
    const config = vscode.workspace.getConfiguration('codegraphy.physics');
    return readGraphViewPhysicsSettings(config, DEFAULT_PHYSICS);
  }

  /**
   * Sends current physics settings to the webview.
   */
  private _sendPhysicsSettings(): void {
    const settings = this._getPhysicsSettings();
    this._sendMessage({ type: 'PHYSICS_SETTINGS_UPDATED', payload: settings });
  }

  /**
   * Sends all current settings to the webview in a single batch.
   * Used after reset/undo to ensure the webview is fully in sync.
   */
  private _sendAllSettings(): void {
    const snapshot = captureGraphViewSettingsSnapshot(
      vscode.workspace.getConfiguration('codegraphy'),
      this._getPhysicsSettings(),
      this._nodeSizeMode,
    );
    const state = {
      viewContext: this._viewContext,
      hiddenPluginGroupIds: this._hiddenPluginGroupIds,
      userGroups: this._userGroups,
      filterPatterns: this._filterPatterns,
    };
    applyGraphViewAllSettingsSnapshot(
      snapshot,
      this._analyzer?.getPluginFilterPatterns() ?? [],
      state,
      {
        sendMessage: (message) => this._sendMessage(message),
        recomputeGroups: () => this._computeMergedGroups(),
        sendGroupsUpdated: () => this._sendGroupsUpdated(),
      },
    );
    this._hiddenPluginGroupIds = state.hiddenPluginGroupIds;
    this._userGroups = state.userGroups;
    this._filterPatterns = state.filterPatterns;
  }

  /**
   * Updates a single physics setting.
   * Uses workspace config if available, falls back to global config.
   * Note: We don't call _sendPhysicsSettings() here because:
   * 1. The slider already has immediate feedback via onSettingsChange
   * 2. The config change listener will send the update for external changes
   */
  private async _updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void> {
    const config = vscode.workspace.getConfiguration('codegraphy.physics');
    const target = getGraphViewConfigTarget(vscode.workspace.workspaceFolders);
    await config.update(key, value, target);
    // Config change listener handles sending PHYSICS_SETTINGS_UPDATED
  }

  /**
   * Resets all physics settings to defaults.
   * Uses workspace config if available, falls back to global config.
   * Note: Config change listener handles sending PHYSICS_SETTINGS_UPDATED
   */
  private async _resetPhysicsSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codegraphy.physics');
    const target = getGraphViewConfigTarget(vscode.workspace.workspaceFolders);
    await config.update('repelForce', undefined, target);
    await config.update('linkDistance', undefined, target);
    await config.update('linkForce', undefined, target);
    await config.update('damping', undefined, target);
    await config.update('centerForce', undefined, target);
    // Config change listener handles sending PHYSICS_SETTINGS_UPDATED
  }

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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
