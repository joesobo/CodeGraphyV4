import * as path from 'path';
import * as vscode from 'vscode';
import { getGraphViewUriKey } from './resourceRoots';

export { getGraphViewUriKey, getGraphViewLocalResourceRoots } from './resourceRoots';

function resolveGraphViewFileUri(
  assetPath: string,
  extensionUri: vscode.Uri,
  pluginExtensionUris: ReadonlyMap<string, vscode.Uri>,
  pluginId?: string,
): vscode.Uri {
  const pluginRoot = pluginId ? pluginExtensionUris.get(pluginId) : undefined;
  return path.isAbsolute(assetPath)
    ? vscode.Uri.file(assetPath)
    : vscode.Uri.joinPath(pluginRoot ?? extensionUri, assetPath);
}

function stringifyWebviewUri(webviewUri: unknown): string {
  const text = String(webviewUri);
  if (text && text !== '[object Object]') {
    return text;
  }

  const pathLike = webviewUri as { path?: string; fsPath?: string } | null;
  return pathLike?.path ?? pathLike?.fsPath ?? text;
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

  const fileUri = resolveGraphViewFileUri(assetPath, extensionUri, pluginExtensionUris, pluginId);

  if (!webview) {
    return getGraphViewUriKey(fileUri);
  }

  return stringifyWebviewUri(webview.asWebviewUri(fileUri) as unknown);
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
