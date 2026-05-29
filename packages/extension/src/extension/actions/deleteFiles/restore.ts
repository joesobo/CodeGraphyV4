import * as vscode from 'vscode';
import type { StoredFile } from './backup';
import { sortDirectoryPathsByDepth } from './paths';

export async function restoreDirectories(
  workspaceFolder: vscode.Uri,
  directoryPaths: string[],
): Promise<void> {
  for (const directoryPath of sortDirectoryPathsByDepth(directoryPaths)) {
    const directoryUri = vscode.Uri.joinPath(workspaceFolder, directoryPath);
    try {
      await vscode.workspace.fs.createDirectory(directoryUri);
    } catch (error) {
      console.error(`[CodeGraphy] Failed to restore ${directoryPath}:`, error);
      vscode.window.showErrorMessage(`Failed to restore ${directoryPath}`);
    }
  }
}

export async function restoreFiles(
  workspaceFolder: vscode.Uri,
  storedFiles: StoredFile[],
): Promise<void> {
  for (const storedFile of storedFiles) {
    const fileUri = vscode.Uri.joinPath(workspaceFolder, storedFile.path);
    try {
      await vscode.workspace.fs.writeFile(fileUri, storedFile.content);
    } catch (error) {
      console.error(`[CodeGraphy] Failed to restore ${storedFile.path}:`, error);
      vscode.window.showErrorMessage(`Failed to restore ${storedFile.path}`);
    }
  }
}
