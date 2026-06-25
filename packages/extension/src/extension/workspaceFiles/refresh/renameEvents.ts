import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';

type WorkspaceRenameFiles = vscode.FileRenameEvent['files'];

export function getRenameFilePaths(files: WorkspaceRenameFiles): string[] {
  return files.flatMap(file => [file.oldUri.fsPath, file.newUri.fsPath]);
}

export function emitWorkspaceRenameEvents(
  provider: GraphViewProvider,
  files: WorkspaceRenameFiles,
): void {
  for (const file of files) {
    provider.emitEvent('workspace:fileRenamed', {
      oldPath: file.oldUri.fsPath,
      newPath: file.newUri.fsPath,
    });
  }
}
