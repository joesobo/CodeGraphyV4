import * as vscode from 'vscode';

const NONCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export type CodeGraphyWebviewThemeKind = 'light' | 'dark' | 'high-contrast';

export function createGraphViewNonce(random: () => number = Math.random): string {
  let text = '';
  for (let index = 0; index < 32; index++) {
    text += NONCE_CHARS.charAt(Math.floor(random() * NONCE_CHARS.length));
  }
  return text;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createGraphViewHtml(
  extensionUri: vscode.Uri,
  webview: Pick<vscode.Webview, 'asWebviewUri' | 'cspSource'>,
  nonce: string,
  initialTheme: CodeGraphyWebviewThemeKind = 'dark',
  enableGraphDebug = false,
  workspaceName?: string,
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'index.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'index.css')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval'; worker-src ${webview.cspSource} blob:; connect-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link href="${styleUri.toString()}" rel="stylesheet">
  <title>CodeGraphy</title>
</head>
<body data-codegraphy-theme="${initialTheme}"${enableGraphDebug ? ' data-codegraphy-debug="true"' : ''}${workspaceName?.trim() ? ` data-codegraphy-workspace-name="${escapeHtmlAttribute(workspaceName.trim())}"` : ''}>
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}
