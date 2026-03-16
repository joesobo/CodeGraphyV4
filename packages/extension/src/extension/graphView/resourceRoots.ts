import * as vscode from 'vscode';

interface IWorkspaceFolderLike {
  uri: vscode.Uri;
}

export function getGraphViewUriKey(uri: vscode.Uri): string {
  const candidate = uri as unknown as { fsPath?: string; path?: string; toString(): string };
  return candidate.fsPath ?? candidate.path ?? candidate.toString();
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
