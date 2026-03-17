import * as path from 'path';
import * as vscode from 'vscode';
import { getGraphViewUriKey } from './resourceRoots';

export { getGraphViewUriKey, getGraphViewLocalResourceRoots } from './resourceRoots';

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
  const text = String(webviewUri);
  if (text && text !== '[object Object]') {
    return text;
  }

  const pathLike = webviewUri as { path?: string; fsPath?: string } | null;
  return pathLike?.path ?? pathLike?.fsPath ?? text;
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
