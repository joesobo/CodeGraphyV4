import * as fs from 'node:fs/promises';
import { isWithinWorkspace } from './workspaceBounds';

export async function listDirectoryWithinWorkspace(
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

export async function readTextFileWithinWorkspace(
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
