import * as path from 'path';
import * as vscode from 'vscode';

interface IWorkspaceFolderLike {
  uri: vscode.Uri;
}

export function resolveGraphViewAssetPath(
  assetPath: string,
  extensionUri: vscode.Uri,
  pluginExtensionUris: ReadonlyMap<string, vscode.Uri>,
  webview?: Pick<vscode.Webview, 'asWebviewUri'>,
  pluginId?: string
): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const pluginRoot = pluginId ? pluginExtensionUris.get(pluginId) : undefined;
  const fileUri = path.isAbsolute(assetPath)
    ? vscode.Uri.file(assetPath)
    : vscode.Uri.joinPath(pluginRoot ?? extensionUri, assetPath);

  if (!webview) {
    return getGraphViewUriKey(fileUri);
  }

  const webviewUri = webview.asWebviewUri(fileUri) as unknown;
  if (typeof webviewUri === 'string') {
    return webviewUri;
  }
  if (
    webviewUri &&
    typeof (webviewUri as { toString?: () => string }).toString === 'function'
  ) {
    const text = (webviewUri as { toString: () => string }).toString();
    if (text && text !== '[object Object]') {
      return text;
    }
  }

  const pathLike = webviewUri as { path?: string; fsPath?: string } | null;
  return pathLike?.path ?? pathLike?.fsPath ?? String(webviewUri);
}

export function getGraphViewLocalResourceRoots(
  extensionUri: vscode.Uri,
  pluginExtensionUris: ReadonlyMap<string, vscode.Uri>,
  workspaceFolders: readonly IWorkspaceFolderLike[] | undefined
): vscode.Uri[] {
  const roots = new Map<string, vscode.Uri>();
  roots.set(getGraphViewUriKey(extensionUri), extensionUri);

  for (const uri of pluginExtensionUris.values()) {
    roots.set(getGraphViewUriKey(uri), uri);
  }

  for (const folder of workspaceFolders ?? []) {
    roots.set(getGraphViewUriKey(folder.uri), folder.uri);
  }

  return [...roots.values()];
}

export function getGraphViewUriKey(uri: vscode.Uri): string {
  const candidate = uri as unknown as { fsPath?: string; path?: string; toString(): string };
  return candidate.fsPath ?? candidate.path ?? candidate.toString();
}

export function normalizeGraphViewExtensionUri(
  uri: vscode.Uri | string | undefined
): vscode.Uri | undefined {
  if (!uri) return undefined;
  if (typeof uri === 'string') {
    return vscode.Uri.file(uri);
  }
  return uri;
}
