import * as vscode from 'vscode';
import {
  getGraphViewLocalResourceRoots,
  getGraphViewUriKey,
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

function getResourceRootKey(uri: vscode.Uri): string {
  return getGraphViewUriKey(uri);
}

function hasNewLocalResourceRoots(
  current: readonly vscode.Uri[] | undefined,
  next: readonly vscode.Uri[],
): boolean {
  const currentKeys = new Set((current ?? []).map(getResourceRootKey));
  return next.some(uri => !currentKeys.has(getResourceRootKey(uri)));
}

function mergeLiveWebviewResourceRoots(
  current: readonly vscode.Uri[] | undefined,
  next: readonly vscode.Uri[],
): vscode.Uri[] {
  // Narrowing these options recreates live webview content. Keep roots
  // monotonic for one webview lifetime; new webviews receive the clean set.
  const rootsByKey = new Map<string, vscode.Uri>();
  for (const uri of current ?? []) {
    rootsByKey.set(getResourceRootKey(uri), uri);
  }
  for (const uri of next) {
    rootsByKey.set(getResourceRootKey(uri), uri);
  }
  return [...rootsByKey.values()];
}

function refreshWebviewResourceRoots(
  webview: vscode.Webview,
  localResourceRoots: readonly vscode.Uri[],
): void {
  if (!hasNewLocalResourceRoots(webview.options.localResourceRoots, localResourceRoots)) {
    return;
  }

  const mergedRoots = mergeLiveWebviewResourceRoots(
    webview.options.localResourceRoots,
    localResourceRoots,
  );

  webview.options = {
    ...webview.options,
    localResourceRoots: mergedRoots,
  };
}

export function refreshGraphViewResourceRoots(
  view: vscode.WebviewView | undefined,
  panels: readonly vscode.WebviewPanel[],
  localResourceRoots: readonly vscode.Uri[],
): void {
  if (view) {
    refreshWebviewResourceRoots(view.webview, localResourceRoots);
  }

  for (const panel of panels) {
    refreshWebviewResourceRoots(panel.webview, localResourceRoots);
  }
}
