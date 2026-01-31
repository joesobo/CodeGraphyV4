/**
 * @fileoverview Provides the webview panel for displaying the dependency graph.
 * Handles communication between the extension and the React webview,
 * including graph data updates and position persistence.
 * @module extension/GraphViewProvider
 */

import * as vscode from 'vscode';
import {
  IGraphData,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from '../shared/types';
import { WorkspaceAnalyzer } from './WorkspaceAnalyzer';

/** Storage key for persisted node positions in workspace state */
const POSITIONS_KEY = 'codegraphy.nodePositions';

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

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._setWebviewMessageListener(webviewView.webview);
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
    if (!this._analyzer) {
      // No analyzer - send empty data
      console.log('[CodeGraphy] No analyzer available');
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
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
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
      return;
    }

    // Analyze real workspace
    try {
      this._graphData = await this._analyzer.analyze();
      this._applyPersistedPositions();
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
    } catch (error) {
      console.error('[CodeGraphy] Analysis failed:', error);
      // Send empty data on error
      this._graphData = { nodes: [], edges: [] };
      this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
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
    for (const node of this._graphData.nodes) {
      const savedPos = positions[node.id];
      if (savedPos) {
        node.x = savedPos.x;
        node.y = savedPos.y;
      }
    }
  }

  /**
   * Sets up the message listener for webview-to-extension communication.
   * Handles all message types defined in WebviewToExtensionMessage.
   * 
   * @param webview - The webview to listen to
   */
  private _setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      switch (message.type) {
        case 'WEBVIEW_READY':
          // Analyze workspace and send graph data
          this._analyzeAndSendData();
          break;

        case 'NODE_SELECTED':
          console.log('[CodeGraphy] Node selected:', message.payload.nodeId);
          break;

        case 'NODE_DOUBLE_CLICKED':
          this._openFile(message.payload.nodeId);
          break;

        case 'NODE_POSITION_CHANGED':
          this._handleNodePositionChanged(
            message.payload.nodeId,
            message.payload.x,
            message.payload.y
          );
          break;

        case 'POSITIONS_UPDATED':
          this._handlePositionsUpdated(message.payload.positions);
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
    } catch (error) {
      console.error('[CodeGraphy] Failed to open file:', error);
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
    }
  }

  /**
   * Handles a single node position change from user dragging.
   * Updates the in-memory graph data and triggers a debounced save.
   * 
   * @param nodeId - ID of the moved node
   * @param x - New X position
   * @param y - New Y position
   */
  private _handleNodePositionChanged(nodeId: string, x: number, y: number): void {
    const node = this._graphData.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.x = x;
      node.y = y;
    }
    this._savePositions();
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
