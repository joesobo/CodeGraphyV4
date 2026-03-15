import * as vscode from 'vscode';

interface OpenGraphViewInEditorOptions {
  viewType: string;
  extensionUri: vscode.Uri;
  getLocalResourceRoots: () => vscode.Uri[];
  createPanel: (
    viewType: string,
    title: string,
    column: vscode.ViewColumn,
    options: vscode.WebviewOptions & vscode.WebviewPanelOptions,
  ) => vscode.WebviewPanel;
  setWebviewMessageListener: (webview: vscode.Webview) => void;
  getHtmlForWebview: (webview: vscode.Webview) => string;
  registerPanel: (panel: vscode.WebviewPanel) => void;
  unregisterPanel: (panel: vscode.WebviewPanel) => void;
}

export function openGraphViewInEditor({
  viewType,
  extensionUri,
  getLocalResourceRoots,
  createPanel,
  setWebviewMessageListener,
  getHtmlForWebview,
  registerPanel,
  unregisterPanel,
}: OpenGraphViewInEditorOptions): void {
  const panel = createPanel(viewType, 'CodeGraphy', vscode.ViewColumn.Active, {
    enableScripts: true,
    localResourceRoots: getLocalResourceRoots(),
    retainContextWhenHidden: true,
  });

  panel.iconPath = vscode.Uri.joinPath(extensionUri, 'assets', 'icon.svg');
  setWebviewMessageListener(panel.webview);
  panel.webview.html = getHtmlForWebview(panel.webview);
  registerPanel(panel);
  panel.onDidDispose(() => {
    unregisterPanel(panel);
  });
}
