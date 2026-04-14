import type * as vscode from 'vscode';
import type { GraphViewProviderWebviewMethodDependencies } from './defaultDependencies';
import type { GraphViewProviderWebviewResolveSource } from './resolve';

export interface GraphViewProviderEditorSource extends GraphViewProviderWebviewResolveSource {
  _panels: vscode.WebviewPanel[];
}

export function openGraphViewProviderWebviewInEditor(
  source: GraphViewProviderEditorSource,
  dependencies: Pick<
    GraphViewProviderWebviewMethodDependencies,
    'createHtml' | 'createPanel' | 'openInEditor' | 'setWebviewMessageListener' | 'viewType'
  >,
): void {
  dependencies.openInEditor({
    viewType: dependencies.viewType,
    extensionUri: source._extensionUri,
    getPanels: () => source._panels,
    getLocalResourceRoots: () => source._getLocalResourceRoots(),
    createPanel: (
      viewType: string,
      title: string,
      column: vscode.ViewColumn,
      options: vscode.WebviewOptions & vscode.WebviewPanelOptions,
    ) =>
      dependencies.createPanel(viewType, title, column, options),
    setWebviewMessageListener: (webview: vscode.Webview) =>
      dependencies.setWebviewMessageListener(webview, source as never),
    getHtmlForWebview: (webview: vscode.Webview) =>
      dependencies.createHtml(source._extensionUri, webview, 'graph'),
    registerPanel: (panel: vscode.WebviewPanel) => {
      source._panels.push(panel);
    },
    unregisterPanel: (panel: vscode.WebviewPanel) => {
      source._panels = source._panels.filter(existingPanel => existingPanel !== panel);
    },
  } as never);
}
