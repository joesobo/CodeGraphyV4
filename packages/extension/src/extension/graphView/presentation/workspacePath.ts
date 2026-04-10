import type * as vscode from 'vscode';
import type { IWorkspaceFolderLike } from './contracts';

export function getRelativeWorkspacePath(
  uri: vscode.Uri,
  workspaceFolders: readonly IWorkspaceFolderLike[] | undefined,
  asRelativePath: (uri: vscode.Uri, includeWorkspaceFolder?: boolean) => string
): string | undefined {
  const workspaceFolder = workspaceFolders?.[0];
  if (!workspaceFolder) return undefined;

  const relativePath = asRelativePath(uri, false);
  return relativePath !== uri.fsPath ? relativePath : undefined;
}
