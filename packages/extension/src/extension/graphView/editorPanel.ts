import * as vscode from 'vscode';

interface OpenGraphViewInEditorOptions {
  viewType: string;
  extensionUri: vscode.Uri;
  getPanels: () => readonly vscode.WebviewPanel[];
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
  getPanels,
  getLocalResourceRoots,
  createPanel,
  setWebviewMessageListener,
  getHtmlForWebview,
  registerPanel,
  unregisterPanel,
}: OpenGraphViewInEditorOptions): void {
  const existingPanel = getPanels()[0];
  if (existingPanel) {
    existingPanel.reveal?.(vscode.ViewColumn.Beside);
    return;
  }

  const panel = createPanel(viewType, 'CodeGraphy', vscode.ViewColumn.Beside, {
    enableScripts: true,
    localResourceRoots: getLocalResourceRoots(),
    retainContextWhenHidden: true,
  });

  panel.iconPath = {
    dark: vscode.Uri.joinPath(extensionUri, 'assets', 'icon-dark.svg'),
    light: vscode.Uri.joinPath(extensionUri, 'assets', 'icon-light.svg'),
  };
  setWebviewMessageListener(panel.webview);
  panel.webview.html = getHtmlForWebview(panel.webview);
  registerPanel(panel);
  panel.onDidDispose(() => {
    unregisterPanel(panel);
  });
}
