import * as vscode from 'vscode';

const NONCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export type CodeGraphyWebviewKind = 'graph' | 'timeline';

export function createGraphViewNonce(random: () => number = Math.random): string {
  let text = '';
  for (let index = 0; index < 32; index++) {
    text += NONCE_CHARS.charAt(Math.floor(random() * NONCE_CHARS.length));
  }
  return text;
}

export function createGraphViewHtml(
  extensionUri: vscode.Uri,
  webview: Pick<vscode.Webview, 'asWebviewUri' | 'cspSource'>,
  nonce: string,
  viewKind: CodeGraphyWebviewKind,
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link href="${styleUri.toString()}" rel="stylesheet">
  <title>CodeGraphy</title>
</head>
<body data-codegraphy-view="${viewKind}">
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}
