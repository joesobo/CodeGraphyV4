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

function areLocalResourceRootsEqual(
  current: readonly vscode.Uri[] | undefined,
  next: readonly vscode.Uri[],
): boolean {
  return Boolean(
    current
    && current.length === next.length
    && current.every((uri, index) => getResourceRootKey(uri) === getResourceRootKey(next[index])),
  );
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
  const mergedRoots = mergeLiveWebviewResourceRoots(
    webview.options.localResourceRoots,
    localResourceRoots,
  );
  if (areLocalResourceRootsEqual(webview.options.localResourceRoots, mergedRoots)) {
    return;
  }

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
