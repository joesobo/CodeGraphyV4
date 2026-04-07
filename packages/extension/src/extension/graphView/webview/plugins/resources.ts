import * as vscode from 'vscode';
import {
  getGraphViewLocalResourceRoots,
  resolveGraphViewAssetPath,
} from '../../resources';

export function resolveGraphViewPluginAssetPath(
  assetPath: string,
  extensionUri: vscode.Uri,
  pluginExtensionUris: ReadonlyMap<string, vscode.Uri>,
  view: vscode.WebviewView | undefined,
  panels: readonly vscode.WebviewPanel[],
  pluginId?: string,
): string {
  const webview = view?.webview ?? panels[0]?.webview;
  return resolveGraphViewAssetPath(
    assetPath,
    extensionUri,
    pluginExtensionUris,
    webview,
    pluginId,
  );
}

export function getGraphViewWebviewResourceRoots(
  extensionUri: vscode.Uri,
  pluginExtensionUris: ReadonlyMap<string, vscode.Uri>,
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): vscode.Uri[] {
  return getGraphViewLocalResourceRoots(
    extensionUri,
    pluginExtensionUris,
    workspaceFolders,
  );
}

export function refreshGraphViewResourceRoots(
  view: vscode.WebviewView | undefined,
  panels: readonly vscode.WebviewPanel[],
  localResourceRoots: readonly vscode.Uri[],
): void {
  if (view) {
    view.webview.options = {
      ...view.webview.options,
      localResourceRoots,
    };
  }

  for (const panel of panels) {
    panel.webview.options = {
      ...panel.webview.options,
      localResourceRoots,
    };
  }
}
