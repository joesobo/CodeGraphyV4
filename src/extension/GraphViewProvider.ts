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

/** Default physics settings */
const DEFAULT_PHYSICS: IPhysicsSettings = {
  gravitationalConstant: -50,
  springLength: 100,
  springConstant: 0.08,
  damping: 0.4,
  centralGravity: 0.01,
};

/** Storage key for persisted node positions in workspace state */
const POSITIONS_KEY = 'codegraphy.nodePositions';

/** Storage key for file visit counts in workspace state */
const VISITS_KEY = 'codegraphy.fileVisits';

/** Storage key for selected view per workspace */
const SELECTED_VIEW_KEY = 'codegraphy.selectedView';

/**
 * Map of node IDs to their persisted positions.
 * Stored in VSCode workspace state for persistence across sessions.
 */
interface NodePositions {
  [nodeId: string]: { x: number; y: number };
}

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
  
  /** Timeout handle for debounced position saves */
  private _saveTimeout?: NodeJS.Timeout;

  /** Workspace analyzer for real file discovery */
  private _analyzer?: WorkspaceAnalyzer;

  /** Whether the analyzer has been initialized */
  private _analyzerInitialized = false;

  /** View registry for managing available views */
  private readonly _viewRegistry: ViewRegistry;

  /** Currently active view ID */
  private _activeViewId: string;

  /** Raw (untransformed) graph data from analysis */
  private _rawGraphData: IGraphData = { nodes: [], edges: [] };

  /** Current view context */
  private _viewContext: IViewContext = {
    activePlugins: new Set(),
  };

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

    // Proactively start analysis - don't rely solely on WEBVIEW_READY
    // The webview might send WEBVIEW_READY before listener is ready, or vice versa
    // This ensures data is always sent
    this._analyzeAndSendData();
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
    this._applyPersistedPositions();
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
    console.log('[CodeGraphy] _analyzeAndSendData called');
    
    if (!this._analyzer) {
      // No analyzer - send empty data
      console.log('[CodeGraphy] No analyzer available');
      this._rawGraphData = { nodes: [], edges: [] };
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
      return;
    }

    // Initialize analyzer if needed
    if (!this._analyzerInitialized) {
      await this._analyzer.initialize();
      this._analyzerInitialized = true;
    }

    // Check if workspace is open
    const hasWorkspace = vscode.workspace.workspaceFolders && 
                         vscode.workspace.workspaceFolders.length > 0;

    if (!hasWorkspace) {
      // No workspace - send empty data
      console.log('[CodeGraphy] No workspace open');
      this._rawGraphData = { nodes: [], edges: [] };
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
      return;
    }

    // Analyze real workspace
    try {
      this._rawGraphData = await this._analyzer.analyze();
      
      // Update view context
      this._updateViewContext();
      
      // Apply view transform
      this._applyViewTransform();
      
      this._applyPersistedPositions();
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
    } catch (error) {
      console.error('[CodeGraphy] Analysis failed:', error);
      // Send empty data on error
      this._rawGraphData = { nodes: [], edges: [] };
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
    }
  }

  /**
   * Updates the view context with current state.
   */
  private _updateViewContext(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const activeEditor = vscode.window.activeTextEditor;
    
    this._viewContext = {
      activePlugins: this._getActivePluginIds(),
      workspaceRoot: workspaceFolder?.uri.fsPath,
      focusedFile: activeEditor ? this._getRelativePath(activeEditor.document.uri) : undefined,
    };
  }

  /**
   * Gets the set of active plugin IDs from the plugin registry.
   */
  private _getActivePluginIds(): Set<string> {
    // Access the plugin registry from the analyzer
    const plugins = new Set<string>();
    if (this._analyzer) {
      const registry = (this._analyzer as unknown as { _registry?: { list?: () => Array<{ plugin?: { id?: string } }> } })._registry;
      if (registry?.list) {
        for (const info of registry.list()) {
          if (info.plugin?.id) {
            plugins.add(info.plugin.id);
          }
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
    this._applyPersistedPositions();
    this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
    this._sendAvailableViews();
  }

  /**
   * Sets the focused file for view context (e.g., for Depth Graph).
   * 
   * @param filePath - Relative path to the focused file
   */
  public setFocusedFile(filePath: string | undefined): void {
    this._viewContext.focusedFile = filePath;
    
    // Re-apply transform if using a view that depends on focused file
    const viewInfo = this._viewRegistry.get(this._activeViewId);
    if (viewInfo?.view.id === 'codegraphy.depth-graph') {
      this._applyViewTransform();
      this._applyPersistedPositions();
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      this._sendAvailableViews();
    }
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
      this._applyPersistedPositions();
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
      console.log('[CodeGraphy] Sending message:', message.type);
      this._view.webview.postMessage(message);
    } else {
      console.log('[CodeGraphy] Cannot send message, no view:', message.type);
    }
  }

  /**
   * Loads persisted node positions from workspace state.
   * 
   * @returns Map of node IDs to positions, empty object if none saved
   */
  private _getPersistedPositions(): NodePositions {
    const positions = this._context.workspaceState.get<NodePositions>(POSITIONS_KEY) ?? {};
    console.log('[CodeGraphy] Loading positions:', Object.keys(positions).length, 'nodes');
    return positions;
  }

  /**
   * Saves node positions to workspace state with debouncing.
   * Waits 500ms after the last call before actually saving to avoid
   * excessive writes during physics simulation or rapid dragging.
   */
  private _savePositions(): void {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = setTimeout(async () => {
      const positions: NodePositions = {};
      for (const node of this._graphData.nodes) {
        if (node.x !== undefined && node.y !== undefined) {
          positions[node.id] = { x: node.x, y: node.y };
        }
      }
      await this._context.workspaceState.update(POSITIONS_KEY, positions);
      console.log('[CodeGraphy] Positions saved:', Object.keys(positions).length, 'nodes');
    }, 500);
  }

  /**
   * Applies persisted positions to the current graph data.
   * Called before sending graph data to webview to restore layout.
   */
  private _applyPersistedPositions(): void {
    const positions = this._getPersistedPositions();
    let applied = 0;
    for (const node of this._graphData.nodes) {
      const savedPos = positions[node.id];
      if (savedPos) {
        node.x = savedPos.x;
        node.y = savedPos.y;
        applied++;
      }
    }
    console.log(`[CodeGraphy] Applied ${applied}/${this._graphData.nodes.length} saved positions`);
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
          // Analyze workspace and send graph data
          this._analyzeAndSendData();
          // Send current favorites
          this._sendFavorites();
          // Send current settings
          this._sendSettings();
          // Send physics settings
          this._sendPhysicsSettings();
          break;

        case 'NODE_SELECTED':
          console.log('[CodeGraphy] Node selected:', message.payload.nodeId);
          break;

        case 'NODE_DOUBLE_CLICKED':
          this._openFile(message.payload.nodeId);
          break;

        case 'POSITIONS_UPDATED':
          this._handlePositionsUpdated(message.payload.positions);
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
          await this._resetPhysicsSettings()
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
   * Handles bulk position updates, typically after physics stabilization.
   * Updates all node positions in memory and triggers a debounced save.
   * 
   * @param positions - Map of node IDs to their new positions
   */
  private _handlePositionsUpdated(positions: Record<string, { x: number; y: number }>): void {
    for (const node of this._graphData.nodes) {
      const pos = positions[node.id];
      if (pos) {
        node.x = pos.x;
        node.y = pos.y;
      }
    }
    this._savePositions();
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
    this._sendMessage({ type: 'SETTINGS_UPDATED', payload: { bidirectionalEdges } });
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
      let plugin: string | undefined;
      if (this._analyzer) {
        const registry = (this._analyzer as unknown as { _registry?: { getPluginForFile?: (path: string) => { plugin?: { name?: string } } | undefined } })._registry;
        if (registry?.getPluginForFile) {
          const pluginInfo = registry.getPluginForFile(filePath);
          plugin = pluginInfo?.plugin?.name;
        }
      }

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
      gravitationalConstant: config.get<number>('gravitationalConstant', DEFAULT_PHYSICS.gravitationalConstant),
      springLength: config.get<number>('springLength', DEFAULT_PHYSICS.springLength),
      springConstant: config.get<number>('springConstant', DEFAULT_PHYSICS.springConstant),
      damping: config.get<number>('damping', DEFAULT_PHYSICS.damping),
      centralGravity: config.get<number>('centralGravity', DEFAULT_PHYSICS.centralGravity),
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
    await config.update('gravitationalConstant', undefined, target);
    await config.update('springLength', undefined, target);
    await config.update('springConstant', undefined, target);
    await config.update('damping', undefined, target);
    await config.update('centralGravity', undefined, target);
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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
