import { access } from 'node:fs/promises';
import path from 'node:path';

export type DocumentPathExists = (documentPath: string) => Promise<boolean>;

async function pathExists(documentPath: string): Promise<boolean> {
  try {
    await access(documentPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function createNewDocumentPath(
  workspaceRoot: string,
  exists: DocumentPathExists = pathExists,
): Promise<string> {
  for (let number = 1; ; number += 1) {
    const suffix = number === 1 ? '' : ` ${number}`;
    const candidate = path.join(workspaceRoot, `CodeGraphy${suffix}.tldraw`);
    if (!await exists(candidate)) return candidate;
  }
}
