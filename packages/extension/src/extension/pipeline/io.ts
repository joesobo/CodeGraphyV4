import * as vscode from 'vscode';

export function getWorkspacePipelineRoot(
  workspaceFolders: typeof vscode.workspace.workspaceFolders,
): string | undefined {
  return workspaceFolders?.[0]?.uri?.fsPath;
}

export async function getWorkspacePipelineFileStat(
  filePath: string,
  fileSystem: typeof vscode.workspace.fs,
): Promise<{ mtime: number; size: number } | null> {
  try {
    const stat = await fileSystem.stat(vscode.Uri.file(filePath));
    return { mtime: stat.mtime, size: stat.size };
  } catch {
    return null;
  }
}
