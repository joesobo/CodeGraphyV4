import * as vscode from 'vscode';
import {
  IGraphData,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from '../shared/types';
import { getMockGraphData } from '../shared/mockData';

const POSITIONS_KEY = 'codegraphy.nodePositions';

interface NodePositions {
  [nodeId: string]: { x: number; y: number };
}

export class GraphViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codegraphy.graphView';

  private _view?: vscode.WebviewView;
  private _graphData: IGraphData = { nodes: [], edges: [] };
  private _saveTimeout?: NodeJS.Timeout;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

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
   * Update graph data and notify webview
   */
  public updateGraphData(data: IGraphData): void {
    this._graphData = data;
    this._applyPersistedPositions();
    this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
  }

  /**
   * Get current graph data
   */
  public getGraphData(): IGraphData {
    return this._graphData;
  }

  /**
   * Send message to webview
   */
  private _sendMessage(message: ExtensionToWebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Load persisted positions from workspace state
   */
  private _getPersistedPositions(): NodePositions {
    const positions = this._context.workspaceState.get<NodePositions>(POSITIONS_KEY) ?? {};
    console.log('[CodeGraphy] Loading positions:', Object.keys(positions).length, 'nodes');
    return positions;
  }

  /**
   * Save positions to workspace state (debounced)
   */
  private _savePositions(): void {
    // Debounce saves - only save after 500ms of no changes
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
   * Apply persisted positions to graph data
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
   * Handle messages from webview
   */
  private _setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      switch (message.type) {
        case 'WEBVIEW_READY':
          // Send current graph data when webview is ready
          // If no real data yet, use mock data for development
          if (this._graphData.nodes.length === 0) {
            this._graphData = getMockGraphData();
            this._applyPersistedPositions();
          }
          this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: this._graphData });
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
   * Open a file in the editor
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
   * Handle node position changes (for persistence)
   */
  private _handleNodePositionChanged(nodeId: string, x: number, y: number): void {
    // Update position in graph data
    const node = this._graphData.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.x = x;
      node.y = y;
    }

    // Persist to workspace state (debounced)
    this._savePositions();
  }

  /**
   * Handle bulk positions update (e.g., after physics stabilization)
   */
  private _handlePositionsUpdated(positions: Record<string, { x: number; y: number }>): void {
    // Update all positions in graph data
    for (const node of this._graphData.nodes) {
      const pos = positions[node.id];
      if (pos) {
        node.x = pos.x;
        node.y = pos.y;
      }
    }

    // Persist to workspace state (debounced)
    this._savePositions();
  }

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

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
