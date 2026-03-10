/**
 * @fileoverview Provides the webview panel for displaying the dependency graph.
 * Handles communication between the extension and the React webview,
 * including graph data updates and position persistence.
 * @module extension/GraphViewProvider
 */

import * as vscode from 'vscode';
import {
  IGraphData,
  IAvailableView,
  BidirectionalEdgeMode,
  IPhysicsSettings,
  IGroup,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from '../shared/types';
import { WorkspaceAnalyzer } from './WorkspaceAnalyzer';
import { getUndoManager } from './UndoManager';
import {
  ToggleFavoriteAction,
  AddToExcludeAction,
  DeleteFilesAction,
  RenameFileAction,
  CreateFileAction,
} from './actions';
import { ViewRegistry, coreViews, IViewContext } from '../core/views';

/** Default physics settings (user-facing normalized values) */
const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 0.15,
  damping: 0.7,
  centerForce: 0.1,
};

/** Storage key for file visit counts in workspace state */
const VISITS_KEY = 'codegraphy.fileVisits';

/** Storage key for selected view per workspace */
const SELECTED_VIEW_KEY = 'codegraphy.selectedView';

/** Storage key for groups in workspace state */
const GROUPS_KEY = 'codegraphy.groups';

/** Storage key for filter patterns in workspace state */
const FILTER_PATTERNS_KEY = 'codegraphy.filterPatterns';

/** Storage key for depth limit per workspace */
const DEPTH_LIMIT_KEY = 'codegraphy.depthLimit';

/** Storage key for disabled rules in workspace state */
const DISABLED_RULES_KEY = 'codegraphy.disabledRules';

/** Storage key for disabled plugins in workspace state */
const DISABLED_PLUGINS_KEY = 'codegraphy.disabledPlugins';

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
 * - File opening on node double-click
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

  /** Reference to the webview view, undefined until resolved */
  private _view?: vscode.WebviewView;
  
  /** Current graph data being displayed */
  private _graphData: IGraphData = { nodes: [], edges: [] };
  
  /** Workspace analyzer for real file discovery */
  private _analyzer?: WorkspaceAnalyzer;

  /** Whether the analyzer has been initialized */
  private _analyzerInitialized = false;

  /** Abort controller for the currently running analysis (if any). */
  private _analysisController?: AbortController;

  /** Monotonic analysis request counter; latest request wins. */
  private _analysisRequestId = 0;

  /** View registry for managing available views */
  private readonly _viewRegistry: ViewRegistry;

  /** Currently active view ID */
  private _activeViewId: string;

  /** Raw (untransformed) graph data from analysis */
  private _rawGraphData: IGraphData = { nodes: [], edges: [] };

  /** Current view context */
  private _viewContext: IViewContext = {
    activePlugins: new Set(),
    depthLimit: DEFAULT_DEPTH_LIMIT,
  };

  /** Groups for client-side file coloring */
  private _groups: IGroup[] = [];

  /** Filter patterns passed to analysis (extension-side exclusions) */
  private _filterPatterns: string[] = [];

  /** Disabled rule qualified IDs (e.g., "codegraphy.typescript:es6-import") */
  private _disabledRules: Set<string> = new Set();

  /** Disabled plugin IDs (e.g., "codegraphy.typescript") */
  private _disabledPlugins: Set<string> = new Set();

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
    this._analyzer = new WorkspaceAnalyzer(_context);

    // Initialize view registry with core views
    this._viewRegistry = new ViewRegistry();
    for (const view of coreViews) {
      this._viewRegistry.register(view, { core: true, isDefault: view.id === 'codegraphy.connections' });
    }

    // Restore selected view from workspace state, or use default
    const savedViewId = this._context.workspaceState.get<string>(SELECTED_VIEW_KEY);
    this._activeViewId = savedViewId && this._viewRegistry.get(savedViewId)
      ? savedViewId
      : this._viewRegistry.getDefaultViewId() ?? 'codegraphy.connections';

    // Restore disabled rules and plugins from workspace state
    const savedDisabledRules = this._context.workspaceState.get<string[]>(DISABLED_RULES_KEY);
    if (savedDisabledRules) {
      this._disabledRules = new Set(savedDisabledRules);
    }
    const savedDisabledPlugins = this._context.workspaceState.get<string[]>(DISABLED_PLUGINS_KEY);
    if (savedDisabledPlugins) {
      this._disabledPlugins = new Set(savedDisabledPlugins);
    }
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
      localResourceRoots: [this._extensionUri],
    };

    // Set up message listener BEFORE loading HTML to avoid race condition
    this._setWebviewMessageListener(webviewView.webview);

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Set context for keybindings - initial state
    vscode.commands.executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

    // Listen for visibility changes (e.g., switching between views)
    // When view becomes visible again, re-send the graph data
    webviewView.onDidChangeVisibility(() => {
      // Update keybinding context
      vscode.commands.executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

      if (webviewView.visible) {
        console.log('[CodeGraphy] View became visible, re-sending data');
        this._analyzeAndSendData();
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
    // Cancel current run and immediately prioritize the latest refresh request.
    this._analysisController?.abort();
    const controller = new AbortController();
    this._analysisController = controller;
    const requestId = ++this._analysisRequestId;

    try {
      await this._doAnalyzeAndSendData(controller.signal, requestId);
    } catch (error) {
      if (!this._isAbortError(error)) {
        console.error('[CodeGraphy] Analysis failed:', error);
      }
    } finally {
      if (this._analysisController === controller) {
        this._analysisController = undefined;
      }
    }
  }

  private async _doAnalyzeAndSendData(signal: AbortSignal, requestId: number): Promise<void> {
    if (this._isAnalysisStale(signal, requestId)) return;

    if (!this._analyzer) {
      // No analyzer - send empty data
      this._rawGraphData = { nodes: [], edges: [] };
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
      return;
    }

    // Initialize analyzer if needed
    if (!this._analyzerInitialized) {
      await this._analyzer.initialize();
      if (this._isAnalysisStale(signal, requestId)) return;
      this._analyzerInitialized = true;
    }

    // Add plugin-provided default file colors into groups (once per group id).
    if (this._mergePluginFileColorGroups()) {
      await this._context.workspaceState.update(GROUPS_KEY, this._groups);
      if (this._isAnalysisStale(signal, requestId)) return;
      this._sendMessage({ type: 'GROUPS_UPDATED', payload: { groups: this._groups } });
    }

    // Check if workspace is open
    const hasWorkspace = vscode.workspace.workspaceFolders && 
                         vscode.workspace.workspaceFolders.length > 0;

    if (!hasWorkspace) {
      // No workspace - send empty data
      this._rawGraphData = { nodes: [], edges: [] };
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
      return;
    }

    // Analyze real workspace
    try {
      this._rawGraphData = await this._analyzer.analyze(
        this._filterPatterns,
        this._disabledRules,
        this._disabledPlugins,
        signal
      );
      if (this._isAnalysisStale(signal, requestId)) return;

      // Update view context
      this._updateViewContext();
      
      // Apply view transform
      this._applyViewTransform();
      
  
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
      this._sendPluginStatuses();
    } catch (error) {
      if (this._isAbortError(error) || this._isAnalysisStale(signal, requestId)) {
        return;
      }
      console.error('[CodeGraphy] Analysis failed:', error);
      // Send empty data on error
      this._rawGraphData = { nodes: [], edges: [] };
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
      this._sendPluginStatuses();
    }
  }

  private _isAnalysisStale(signal: AbortSignal, requestId: number): boolean {
    return signal.aborted || requestId !== this._analysisRequestId;
  }

  private _isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  /**
   * Merges plugin fileColors into the groups list as defaults.
   * Group IDs are deterministic: plugin:<pluginId>:<pattern>
   */
  private _mergePluginFileColorGroups(): boolean {
    if (!this._analyzer) return false;

    const existingIds = new Set(this._groups.map(g => g.id));
    const existingPatternColor = new Set(this._groups.map(g => `${g.pattern}::${g.color}`));
    let changed = false;

    for (const pluginInfo of this._analyzer.registry.list()) {
      const fileColors = pluginInfo.plugin.fileColors;
      if (!fileColors) continue;

      for (const [pattern, color] of Object.entries(fileColors)) {
        const id = `plugin:${pluginInfo.plugin.id}:${pattern}`;
        if (existingIds.has(id) || existingPatternColor.has(`${pattern}::${color}`)) {
          continue;
        }
        this._groups.push({ id, pattern, color });
        existingIds.add(id);
        existingPatternColor.add(`${pattern}::${color}`);
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Updates the view context with current state.
   */
  private _updateViewContext(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const activeEditor = vscode.window.activeTextEditor;
    const savedDepthLimit = this._context.workspaceState.get<number>(DEPTH_LIMIT_KEY);
    
    this._viewContext = {
      activePlugins: this._getActivePluginIds(),
      workspaceRoot: workspaceFolder?.uri.fsPath,
      focusedFile: activeEditor ? this._getRelativePath(activeEditor.document.uri) : undefined,
      depthLimit: savedDepthLimit ?? DEFAULT_DEPTH_LIMIT,
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
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return undefined;
    
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    return relativePath !== uri.fsPath ? relativePath : undefined;
  }

  /**
   * Applies the current view's transform to the raw graph data.
   */
  private _applyViewTransform(): void {
    const viewInfo = this._viewRegistry.get(this._activeViewId);
    
    if (!viewInfo || !this._viewRegistry.isViewAvailable(this._activeViewId, this._viewContext)) {
      // Fall back to default view
      const defaultId = this._viewRegistry.getDefaultViewId();
      if (defaultId && defaultId !== this._activeViewId) {
        this._activeViewId = defaultId;
        this._context.workspaceState.update(SELECTED_VIEW_KEY, defaultId);
        const defaultView = this._viewRegistry.get(defaultId);
        if (defaultView) {
          this._graphData = defaultView.view.transform(this._rawGraphData, this._viewContext);
          return;
        }
      }
      // No valid view - use raw data
      this._graphData = this._rawGraphData;
      return;
    }
    
    this._graphData = viewInfo.view.transform(this._rawGraphData, this._viewContext);
  }

  /**
   * Sends the list of available views to the webview.
   */
  private _sendAvailableViews(): void {
    const availableViews = this._viewRegistry.getAvailableViews(this._viewContext);
    
    const views: IAvailableView[] = availableViews.map(info => ({
      id: info.view.id,
      name: info.view.name,
      icon: info.view.icon,
      description: info.view.description,
      active: info.view.id === this._activeViewId,
    }));
    
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
    if (!this._analyzer) return;
    const plugins = this._analyzer.getPluginStatuses(this._disabledRules, this._disabledPlugins);
    this._sendMessage({ type: 'PLUGINS_UPDATED', payload: { plugins } });
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
  }

  /**
   * Intelligently rebuilds graph only when the toggled rule/plugin has connections.
   * If the rule/plugin has 0 connections, only the plugin statuses are updated
   * since the graph wouldn't visually change.
   */
  private _smartRebuild(kind: 'rule' | 'plugin', id: string): void {
    if (!this._analyzer) return;

    const statuses = this._analyzer.getPluginStatuses(this._disabledRules, this._disabledPlugins);
    let hasConnections = false;

    if (kind === 'plugin') {
      const plugin = statuses.find(p => p.id === id);
      hasConnections = (plugin?.connectionCount ?? 0) > 0;
    } else {
      for (const plugin of statuses) {
        const rule = plugin.rules.find(r => r.qualifiedId === id);
        if (rule) {
          hasConnections = rule.connectionCount > 0;
          break;
        }
      }
    }

    if (hasConnections) {
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
    // This ensures the ViewSwitcher dropdown shows the correct options
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
   * Sets the selected folder for view context (e.g., for Subfolder View).
   * 
   * @param folderPath - Relative path to the selected folder
   */
  public setSelectedFolder(folderPath: string | undefined): void {
    this._viewContext.selectedFolder = folderPath;
    
    // Re-apply transform if using a view that depends on selected folder
    const viewInfo = this._viewRegistry.get(this._activeViewId);
    if (viewInfo?.view.id === 'codegraphy.subfolder') {
      this._applyViewTransform();
  
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
    }
  }

  /**
   * Send a command to the webview (for keyboard shortcuts)
   * 
   * @param command - The command to send (FIT_VIEW, ZOOM_IN, ZOOM_OUT)
   */
  public sendCommand(command: 'FIT_VIEW' | 'ZOOM_IN' | 'ZOOM_OUT'): void {
    this._sendMessage({ type: command });
  }

  // ── Test helpers ─────────────────────────────────────────────────────────

  /**
   * Send an arbitrary message to the webview (for e2e tests).
   * Mirrors what the extension sends, e.g. to simulate WEBVIEW_READY.
   */
  public sendToWebview(message: unknown): void {
    this._view?.webview.postMessage(message);
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
   * Request the webview to export layout as JSON.
   */
  public requestExportJson(): void {
    this._sendMessage({ type: 'REQUEST_EXPORT_JSON' });
  }

  /**
   * Sends a message to the webview.
   * 
   * @param message - Message to send to the webview
   */
  private _sendMessage(message: ExtensionToWebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Sets up the message listener for webview-to-extension communication.
   * Handles all message types defined in WebviewToExtensionMessage.
   * 
   * @param webview - The webview to listen to
   */
  private _setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
      switch (message.type) {
        case 'WEBVIEW_READY':
          // Load groups and filter patterns (VS Code settings > workspace state)
          this._loadGroupsAndFilterPatterns();
          // Analyze workspace and send graph data
          this._analyzeAndSendData();
          // Send current favorites
          this._sendFavorites();
          // Send current settings
          this._sendSettings();
          // Send physics settings
          this._sendPhysicsSettings();
          // Send groups and filter patterns
          this._sendMessage({ type: 'GROUPS_UPDATED', payload: { groups: this._groups } });
          this._sendMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { patterns: this._filterPatterns, pluginPatterns: this._analyzer?.getPluginFilterPatterns() ?? [] } });
          this._sendMessage({ type: 'MAX_FILES_UPDATED', payload: { maxFiles: vscode.workspace.getConfiguration('codegraphy').get<number>('maxFiles', 500) } });
          break;

        case 'NODE_SELECTED':
          break;

        case 'NODE_DOUBLE_CLICKED':
          this._openFile(message.payload.nodeId);
          break;

        // Context menu actions
        case 'OPEN_FILE':
          this._openFile(message.payload.path);
          break;
          
        case 'REVEAL_IN_EXPLORER':
          this._revealInExplorer(message.payload.path);
          break;
          
        case 'COPY_TO_CLIPBOARD':
          this._copyToClipboard(message.payload.text);
          break;
          
        case 'DELETE_FILES':
          this._deleteFiles(message.payload.paths);
          break;
          
        case 'RENAME_FILE':
          this._renameFile(message.payload.path);
          break;
          
        case 'CREATE_FILE':
          this._createFile(message.payload.directory);
          break;
          
        case 'TOGGLE_FAVORITE':
          this._toggleFavorites(message.payload.paths);
          break;
          
        case 'ADD_TO_EXCLUDE':
          this._addToExclude(message.payload.patterns);
          break;
          
        case 'REFRESH_GRAPH':
          await this._analyzeAndSendData();
          break;
          
        case 'GET_FILE_INFO':
          this._getFileInfo(message.payload.path);
          break;
          
        case 'EXPORT_PNG':
          await this._saveExportedPng(message.payload.dataUrl, message.payload.filename);
          break;
          
        case 'EXPORT_SVG':
          await this._saveExportedSvg(message.payload.svg, message.payload.filename);
          break;
          
        case 'EXPORT_JSON':
          await this._saveExportedJson(message.payload.json, message.payload.filename);
          break;
          
        case 'GET_PHYSICS_SETTINGS':
          this._sendPhysicsSettings();
          break;
          
        case 'UPDATE_PHYSICS_SETTING':
          await this._updatePhysicsSetting(
            message.payload.key,
            message.payload.value
          );
          break;
          
        case 'RESET_PHYSICS_SETTINGS':
          await this._resetPhysicsSettings();
          break;

        case 'UNDO': {
          const undoDesc = await this.undo();
          if (undoDesc) {
            vscode.window.showInformationMessage(`Undo: ${undoDesc}`);
          } else {
            vscode.window.showInformationMessage('Nothing to undo');
          }
          break;
        }
        
        case 'REDO': {
          const redoDesc = await this.redo();
          if (redoDesc) {
            vscode.window.showInformationMessage(`Redo: ${redoDesc}`);
          } else {
            vscode.window.showInformationMessage('Nothing to redo');
          }
          break;
        }

        case 'CHANGE_VIEW':
          await this.changeView(message.payload.viewId);
          break;

        case 'CHANGE_DEPTH_LIMIT':
          await this.setDepthLimit(message.payload.depthLimit);
          break;

        case 'UPDATE_GROUPS': {
          this._groups = message.payload.groups;
          // Save to workspace state to avoid triggering onDidChangeConfiguration
          await this._context.workspaceState.update(GROUPS_KEY, this._groups);
          this._sendMessage({ type: 'GROUPS_UPDATED', payload: { groups: this._groups } });
          break;
        }

        case 'UPDATE_FILTER_PATTERNS': {
          this._filterPatterns = message.payload.patterns;
          const filterTarget = vscode.workspace.workspaceFolders?.length
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
          await vscode.workspace.getConfiguration('codegraphy').update('filterPatterns', this._filterPatterns, filterTarget);
          this._sendMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { patterns: this._filterPatterns, pluginPatterns: this._analyzer?.getPluginFilterPatterns() ?? [] } });
          // onDidChangeConfiguration fires after config.update and calls refresh() → _analyzeAndSendData().
          // this._filterPatterns is already set above, so that refresh uses the correct patterns.
          break;
        }

        case 'UPDATE_SHOW_ORPHANS': {
          const target = vscode.workspace.workspaceFolders?.length
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
          await vscode.workspace.getConfiguration('codegraphy').update('showOrphans', message.payload.showOrphans, target);
          // Config change listener in index.ts handles re-analysis
          break;
        }

        case 'UPDATE_SHOW_ARROWS': {
          const arrowsTarget = vscode.workspace.workspaceFolders?.length
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
          await vscode.workspace.getConfiguration('codegraphy').update('showArrows', message.payload.showArrows, arrowsTarget);
          this._sendMessage({ type: 'SHOW_ARROWS_UPDATED', payload: { showArrows: message.payload.showArrows } });
          break;
        }

        case 'UPDATE_SHOW_LABELS': {
          const labelsTarget = vscode.workspace.workspaceFolders?.length
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
          await vscode.workspace.getConfiguration('codegraphy').update('showLabels', message.payload.showLabels, labelsTarget);
          this._sendMessage({ type: 'SHOW_LABELS_UPDATED', payload: { showLabels: message.payload.showLabels } });
          break;
        }

        case 'UPDATE_MAX_FILES': {
          const target = vscode.workspace.workspaceFolders?.length
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
          await vscode.workspace.getConfiguration('codegraphy').update('maxFiles', message.payload.maxFiles, target);
          // Config change listener will trigger re-analysis automatically
          break;
        }

        case 'TOGGLE_RULE': {
          const { qualifiedId, enabled } = message.payload;
          if (enabled) {
            this._disabledRules.delete(qualifiedId);
          } else {
            this._disabledRules.add(qualifiedId);
          }
          await this._context.workspaceState.update(DISABLED_RULES_KEY, [...this._disabledRules]);
          this._smartRebuild('rule', qualifiedId);
          break;
        }

        case 'TOGGLE_PLUGIN': {
          const { pluginId, enabled: pluginEnabled } = message.payload;
          if (pluginEnabled) {
            this._disabledPlugins.delete(pluginId);
          } else {
            this._disabledPlugins.add(pluginId);
          }
          await this._context.workspaceState.update(DISABLED_PLUGINS_KEY, [...this._disabledPlugins]);
          this._smartRebuild('plugin', pluginId);
          break;
        }
      }
    });
  }

  /**
   * Opens a file in the VSCode editor.
   * Shows an info message for mock files that don't exist on disk.
   * 
   * @param filePath - Workspace-relative path to the file
   */
  private async _openFile(filePath: string): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        // Mock data - show info message
        vscode.window.showInformationMessage(`Mock file: ${filePath}`);
        return;
      }

      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
      
      // Check if file exists
      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        // File doesn't exist (mock data)
        vscode.window.showInformationMessage(`Mock file: ${filePath}`);
        return;
      }

      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document);
      
      // Track visit
      await this._incrementVisitCount(filePath);
    } catch (error) {
      console.error('[CodeGraphy] Failed to open file:', error);
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
    }
  }

  /**
   * Reveals a file in the VSCode explorer sidebar.
   */
  private async _revealInExplorer(filePath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
    await vscode.commands.executeCommand('revealInExplorer', fileUri);
  }

  /**
   * Copies text to the clipboard.
   */
  private async _copyToClipboard(text: string): Promise<void> {
    // Handle absolute path request
    if (text.startsWith('absolute:')) {
      const relativePath = text.slice(9);
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, relativePath).fsPath;
        await vscode.env.clipboard.writeText(absolutePath);
        return;
      }
    }
    await vscode.env.clipboard.writeText(text);
  }

  /**
   * Deletes files with confirmation (with undo support).
   */
  private async _deleteFiles(paths: string[]): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const count = paths.length;
    const message = count === 1
      ? `Are you sure you want to delete "${paths[0]}"?`
      : `Are you sure you want to delete ${count} files?`;

    const confirm = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      'Delete'
    );

    if (confirm === 'Delete') {
      const action = new DeleteFilesAction(
        paths,
        workspaceFolder.uri,
        () => this._analyzeAndSendData()
      );
      await getUndoManager().execute(action);
    }
  }

  /**
   * Renames a file with an input dialog (with undo support).
   */
  private async _renameFile(filePath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const oldName = filePath.split('/').pop() || filePath;

    const newName = await vscode.window.showInputBox({
      prompt: 'Enter new file name',
      value: oldName,
      valueSelection: [0, oldName.lastIndexOf('.') > 0 ? oldName.lastIndexOf('.') : oldName.length],
      ignoreFocusOut: true, // Prevent dialog from closing on mouse move or focus loss
    });

    if (!newName || newName === oldName) return;

    const newPath = filePath.replace(/[^/]+$/, newName);

    try {
      const action = new RenameFileAction(
        filePath,
        newPath,
        workspaceFolder.uri,
        () => this._analyzeAndSendData()
      );
      await getUndoManager().execute(action);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to rename: ${error}`);
    }
  }

  /**
   * Creates a new file in the workspace (with undo support).
   */
  private async _createFile(directory: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const fileName = await vscode.window.showInputBox({
      prompt: 'Enter file name',
      placeHolder: 'newfile.ts',
      ignoreFocusOut: true, // Prevent dialog from closing on mouse move or focus loss
    });

    if (fileName) {
      const filePath = directory === '.' ? fileName : `${directory}/${fileName}`;

      try {
        const action = new CreateFileAction(
          filePath,
          workspaceFolder.uri,
          () => this._analyzeAndSendData()
        );
        await getUndoManager().execute(action);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create file: ${error}`);
      }
    }
  }

  /**
   * Save exported PNG to file.
   */
  private async _saveExportedPng(dataUrl: string, filename?: string): Promise<void> {
    try {
      // Prompt user for save location
      const defaultFilename = filename || `codegraphy-${Date.now()}.png`;
      // Use workspace folder as default location, fall back to home directory
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
      const defaultUri = workspaceFolder
        ? vscode.Uri.joinPath(workspaceFolder, defaultFilename)
        : vscode.Uri.file(defaultFilename);
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'PNG Images': ['png'] },
        saveLabel: 'Export',
        title: 'Export Graph as PNG',
      });

      if (!saveUri) return; // User cancelled

      // Convert data URL to binary
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Write file
      await vscode.workspace.fs.writeFile(saveUri, buffer);
      
      // Show success message with option to open
      const action = await vscode.window.showInformationMessage(
        `Graph exported to ${saveUri.fsPath}`,
        'Open File',
        'Open Folder'
      );

      if (action === 'Open File') {
        await vscode.commands.executeCommand('vscode.open', saveUri);
      } else if (action === 'Open Folder') {
        await vscode.commands.executeCommand('revealFileInOS', saveUri);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export PNG: ${error}`);
    }
  }

  /**
   * Save exported SVG to file.
   */
  private async _saveExportedSvg(svgContent: string, filename?: string): Promise<void> {
    try {
      const defaultFilename = filename || `codegraphy-${Date.now()}.svg`;
      // Use workspace folder as default location, fall back to home directory
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
      const defaultUri = workspaceFolder
        ? vscode.Uri.joinPath(workspaceFolder, defaultFilename)
        : vscode.Uri.file(defaultFilename);
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'SVG Images': ['svg'] },
        saveLabel: 'Export',
        title: 'Export Graph as SVG',
      });

      if (!saveUri) return;

      const buffer = Buffer.from(svgContent, 'utf-8');
      await vscode.workspace.fs.writeFile(saveUri, buffer);

      const action = await vscode.window.showInformationMessage(
        `Graph exported to ${saveUri.fsPath}`,
        'Open File',
        'Open Folder'
      );

      if (action === 'Open File') {
        await vscode.commands.executeCommand('vscode.open', saveUri);
      } else if (action === 'Open Folder') {
        await vscode.commands.executeCommand('revealFileInOS', saveUri);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export SVG: ${error}`);
    }
  }

  /**
   * Save exported JSON layout to file.
   */
  private async _saveExportedJson(jsonContent: string, filename?: string): Promise<void> {
    try {
      const defaultFilename = filename || `codegraphy-${Date.now()}.json`;
      // Use workspace folder as default location, fall back to home directory
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
      const defaultUri = workspaceFolder
        ? vscode.Uri.joinPath(workspaceFolder, defaultFilename)
        : vscode.Uri.file(defaultFilename);
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'JSON Files': ['json'] },
        saveLabel: 'Export',
        title: 'Export Graph Layout as JSON',
      });

      if (!saveUri) return;

      const buffer = Buffer.from(jsonContent, 'utf-8');
      await vscode.workspace.fs.writeFile(saveUri, buffer);

      const action = await vscode.window.showInformationMessage(
        `Graph layout exported to ${saveUri.fsPath}`,
        'Open File',
        'Open Folder'
      );

      if (action === 'Open File') {
        await vscode.commands.executeCommand('vscode.open', saveUri);
      } else if (action === 'Open Folder') {
        await vscode.commands.executeCommand('revealFileInOS', saveUri);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export JSON: ${error}`);
    }
  }

  /**
   * Toggles favorite status for files (with undo support).
   */
  private async _toggleFavorites(paths: string[]): Promise<void> {
    const action = new ToggleFavoriteAction(paths, () => this._sendFavorites());
    await getUndoManager().execute(action);
  }

  /**
   * Loads groups and filter patterns with VS Code settings taking priority over workspace state.
   */
  private _loadGroupsAndFilterPatterns(): void {
    const config = vscode.workspace.getConfiguration('codegraphy');
    // Use inspect() to distinguish explicitly-set values from schema defaults.
    // config.get() returns the schema default ([]) even when the user hasn't set
    // anything, making the workspace state fallback unreachable via nullish coalescing.
    const groupsInspect = config.inspect<IGroup[]>('groups');
    const patternsInspect = config.inspect<string[]>('filterPatterns');

    const vsGroups = groupsInspect?.workspaceValue ?? groupsInspect?.globalValue;
    const vsFilterPatterns = patternsInspect?.workspaceValue ?? patternsInspect?.globalValue;

    this._groups = vsGroups ?? this._context.workspaceState.get<IGroup[]>(GROUPS_KEY) ?? [];
    this._filterPatterns = vsFilterPatterns ?? this._context.workspaceState.get<string[]>(FILTER_PATTERNS_KEY) ?? [];
  }

  /**
   * Sends current favorites to the webview.
   */
  private _sendFavorites(): void {
    const config = vscode.workspace.getConfiguration('codegraphy');
    const favorites = config.get<string[]>('favorites', []);
    this._sendMessage({ type: 'FAVORITES_UPDATED', payload: { favorites } });
  }

  /**
   * Sends current settings to the webview.
   */
  private _sendSettings(): void {
    const config = vscode.workspace.getConfiguration('codegraphy');
    const bidirectionalEdges = config.get<BidirectionalEdgeMode>('bidirectionalEdges', 'separate');
    const showOrphans = config.get<boolean>('showOrphans', true);
    const showArrows = config.get<boolean>('showArrows', true);
    const showLabels = config.get<boolean>('showLabels', true);
    this._sendMessage({ type: 'SETTINGS_UPDATED', payload: { bidirectionalEdges, showOrphans } });
    this._sendMessage({ type: 'SHOW_ARROWS_UPDATED', payload: { showArrows } });
    this._sendMessage({ type: 'SHOW_LABELS_UPDATED', payload: { showLabels } });
  }

  /**
   * Gets file info and sends it to the webview.
   */
  private async _getFileInfo(filePath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    try {
      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
      const stat = await vscode.workspace.fs.stat(fileUri);

      // Count connections from graph data
      let incomingCount = 0;
      let outgoingCount = 0;
      
      for (const edge of this._graphData.edges) {
        if (edge.to === filePath) incomingCount++;
        if (edge.from === filePath) outgoingCount++;
      }

      // Get plugin name
      if (this._analyzer && !this._analyzerInitialized) {
        await this._analyzer.initialize();
        this._analyzerInitialized = true;
      }
      const plugin = this._analyzer?.getPluginNameForFile(filePath);

      // Get visit count
      const visits = this._getVisitCount(filePath);

      this._sendMessage({
        type: 'FILE_INFO',
        payload: {
          path: filePath,
          size: stat.size,
          lastModified: stat.mtime,
          incomingCount,
          outgoingCount,
          plugin,
          visits,
        },
      });
    } catch (error) {
      console.error('[CodeGraphy] Failed to get file info:', error);
    }
  }

  /**
   * Gets the visit count for a file.
   */
  private _getVisitCount(filePath: string): number {
    const visits = this._context.workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};
    return visits[filePath] ?? 0;
  }

  /**
   * Increments the visit count for a file and notifies the webview.
   */
  private async _incrementVisitCount(filePath: string): Promise<void> {
    const visits = this._context.workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};
    visits[filePath] = (visits[filePath] ?? 0) + 1;
    await this._context.workspaceState.update(VISITS_KEY, visits);
    
    // Notify webview of the updated access count for real-time node size updates
    this._sendMessage({ 
      type: 'NODE_ACCESS_COUNT_UPDATED', 
      payload: { nodeId: filePath, accessCount: visits[filePath] } 
    });
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
    const action = new AddToExcludeAction(patterns, () => this._analyzeAndSendData());
    await getUndoManager().execute(action);
  }

  /**
   * Gets the current physics settings from configuration.
   */
  private _getPhysicsSettings(): IPhysicsSettings {
    const config = vscode.workspace.getConfiguration('codegraphy.physics');
    return {
      repelForce: config.get<number>('repelForce', DEFAULT_PHYSICS.repelForce),
      linkDistance: config.get<number>('linkDistance', DEFAULT_PHYSICS.linkDistance),
      linkForce: config.get<number>('linkForce', DEFAULT_PHYSICS.linkForce),
      damping: config.get<number>('damping', DEFAULT_PHYSICS.damping),
      centerForce: config.get<number>('centerForce', DEFAULT_PHYSICS.centerForce),
    };
  }

  /**
   * Sends current physics settings to the webview.
   */
  private _sendPhysicsSettings(): void {
    const settings = this._getPhysicsSettings();
    this._sendMessage({ type: 'PHYSICS_SETTINGS_UPDATED', payload: settings });
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
    const target = vscode.workspace.workspaceFolders?.length
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;
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
    const target = vscode.workspace.workspaceFolders?.length
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;
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
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource};">
  <link href="${styleUri}" rel="stylesheet">
  <title>CodeGraphy</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/**
 * Generates a random nonce for CSP script-src.
 * Used to allow only specific inline scripts in the webview.
 * 
 * @returns 32-character random alphanumeric string
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
