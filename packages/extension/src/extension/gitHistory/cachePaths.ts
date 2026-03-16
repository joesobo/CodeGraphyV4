import * as path from 'path';
import * as vscode from 'vscode';

export function getCacheDir(storageUri: vscode.Uri | undefined): string | null {
  if (!storageUri) {
    return null;
  }

  return vscode.Uri.joinPath(storageUri, 'git-cache').fsPath;
}

export function getCachePath(storageUri: vscode.Uri | undefined, sha: string): string | null {
  const cacheDir = getCacheDir(storageUri);
  if (!cacheDir) {
    return null;
  }

  return path.join(cacheDir, `${sha}.json`);
}
