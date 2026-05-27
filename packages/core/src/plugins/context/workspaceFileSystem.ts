import * as fs from 'node:fs/promises';
import type { IPluginAnalysisFileSystem } from '@codegraphy-dev/plugin-api';
import { isWithinWorkspace } from './workspaceBounds';
import { listDirectoryWithinWorkspace, readTextFileWithinWorkspace } from './workspaceRead';

async function statIfPresent(filePath: string): Promise<Awaited<ReturnType<typeof fs.stat>> | null> {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function existsWithinWorkspace(
  workspaceRoot: string,
  filePath: string,
): Promise<boolean> {
  if (!isWithinWorkspace(workspaceRoot, filePath)) {
    return false;
  }

  return (await statIfPresent(filePath)) !== null;
}

async function isDirectoryWithinWorkspace(
  workspaceRoot: string,
  filePath: string,
): Promise<boolean> {
  if (!isWithinWorkspace(workspaceRoot, filePath)) {
    return false;
  }

  return (await statIfPresent(filePath))?.isDirectory() ?? false;
}

async function isFileWithinWorkspace(
  workspaceRoot: string,
  filePath: string,
): Promise<boolean> {
  if (!isWithinWorkspace(workspaceRoot, filePath)) {
    return false;
  }

  return (await statIfPresent(filePath))?.isFile() ?? false;
}

export function createWorkspaceAnalysisFileSystem(
  workspaceRoot: string,
): IPluginAnalysisFileSystem {
  return {
    exists: (filePath) => existsWithinWorkspace(workspaceRoot, filePath),
    isDirectory: (filePath) => isDirectoryWithinWorkspace(workspaceRoot, filePath),
    isFile: (filePath) => isFileWithinWorkspace(workspaceRoot, filePath),
    listDirectory: (filePath) => listDirectoryWithinWorkspace(workspaceRoot, filePath),
    readTextFile: (filePath) => readTextFileWithinWorkspace(workspaceRoot, filePath),
  };
}
