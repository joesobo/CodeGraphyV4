import type * as vscode from 'vscode';
import { getWorkspacePipelineFileStat, getWorkspacePipelineRoot } from '../io';

export function readWorkspacePipelineRoot(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): string | undefined {
  return getWorkspacePipelineRoot(workspaceFolders);
}

export function readWorkspacePipelineFileStat(
  filePath: string,
  fileSystem: vscode.FileSystem,
): Promise<{ mtime: number; size: number } | null> {
  return getWorkspacePipelineFileStat(filePath, fileSystem);
}
