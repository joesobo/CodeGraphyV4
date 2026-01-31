import * as vscode from 'vscode';
import {
  IGraphData,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from '../shared/types';

export class GraphViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codegraphy.graphView';

  private _view?: vscode.WebviewView;
  private _graphData: IGraphData = { nodes: [], edges: [] };

  constructor(private readonly _extensionUri: vscode.Uri) {}

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
    this._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: data });
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
   * Handle messages from webview
   */
  private _setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      switch (message.type) {
        case 'WEBVIEW_READY':
          // Send current graph data when webview is ready
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
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
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

    // TODO: Persist to workspace state
    console.log('[CodeGraphy] Node position changed:', nodeId, x, y);
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
