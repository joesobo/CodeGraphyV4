import * as vscode from 'vscode';

export interface StoredFile {
  path: string;
  content: Uint8Array;
}

function isDirectoryStat(stat: vscode.FileStat): boolean {
  return (stat.type & vscode.FileType.Directory) !== 0;
}

export async function storeDirectoryForDeletion(
  directoryPath: string,
  directoryUri: vscode.Uri,
  storedDirectories: string[],
  storedFiles: StoredFile[],
): Promise<void> {
  storedDirectories.push(directoryPath);

  const entries = await vscode.workspace.fs.readDirectory(directoryUri);
  for (const [entryName, entryType] of entries) {
    const entryPath = `${directoryPath}/${entryName}`;
    const entryUri = vscode.Uri.joinPath(directoryUri, entryName);

    if ((entryType & vscode.FileType.Directory) !== 0) {
      await storeDirectoryForDeletion(entryPath, entryUri, storedDirectories, storedFiles);
      continue;
    }

    const content = await vscode.workspace.fs.readFile(entryUri);
    storedFiles.push({ path: entryPath, content });
  }
}

export async function storePathForDeletion(
  workspaceFolder: vscode.Uri,
  filePath: string,
  storedDirectories: string[],
  storedFiles: StoredFile[],
  useTrash = true,
): Promise<void> {
  const fileUri = vscode.Uri.joinPath(workspaceFolder, filePath);
  const stat = await vscode.workspace.fs.stat(fileUri);

  if (isDirectoryStat(stat)) {
    await storeDirectoryForDeletion(filePath, fileUri, storedDirectories, storedFiles);
    await vscode.workspace.fs.delete(fileUri, { recursive: true, useTrash });
    return;
  }

  const content = await vscode.workspace.fs.readFile(fileUri);
  storedFiles.push({ path: filePath, content });
  await vscode.workspace.fs.delete(fileUri, { useTrash });
}
