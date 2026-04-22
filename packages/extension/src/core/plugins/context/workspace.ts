import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  IPluginAnalysisContext,
  IPluginAnalysisFileSystem,
} from '../types/contracts';

function isWithinWorkspace(workspaceRoot: string, filePath: string): boolean {
  const relativePath = path.relative(workspaceRoot, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

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

async function listDirectoryWithinWorkspace(
  workspaceRoot: string,
  filePath: string,
): Promise<string[] | null> {
  if (!isWithinWorkspace(workspaceRoot, filePath)) {
    return null;
  }

  try {
    return await fs.readdir(filePath);
  } catch {
    return null;
  }
}

async function readTextFileWithinWorkspace(
  workspaceRoot: string,
  filePath: string,
): Promise<string | null> {
  if (!isWithinWorkspace(workspaceRoot, filePath)) {
    return null;
  }

  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function createWorkspaceAnalysisFileSystem(
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

export function createWorkspacePluginAnalysisContext(
  workspaceRoot: string,
): IPluginAnalysisContext {
  return {
    mode: 'workspace',
    fileSystem: createWorkspaceAnalysisFileSystem(workspaceRoot),
  };
}
