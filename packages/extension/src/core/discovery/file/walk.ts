/**
 * @fileoverview Directory tree walker for file discovery.
 * @module core/discovery/file/walk
 */

import * as fs from 'fs';
import * as path from 'path';
import { throwIfAborted } from '../abort';
import { shouldSkipKnownDirectory } from '../pathMatching';

/**
 * Recursively walks a directory, calling the callback for each file.
 * @returns false if walking should stop, true otherwise
 */
export async function walkDirectory(
  rootPath: string,
  currentPath: string,
  onFile: (relativePath: string, absolutePath: string) => boolean,
  signal?: AbortSignal,
): Promise<boolean> {
  throwIfAborted(signal);

  let entries: fs.Dirent[];

  try {
    entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
  } catch {
    return true;
  }

  for (const entry of entries) {
    throwIfAborted(signal);

    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, absolutePath);

    if (entry.isDirectory()) {
      if (shouldSkipKnownDirectory(relativePath)) {
        continue;
      }
      const shouldContinue = await walkDirectory(rootPath, absolutePath, onFile, signal);
      if (!shouldContinue) {
        return false;
      }
    } else if (entry.isFile()) {
      const shouldContinue = onFile(relativePath, absolutePath);
      if (!shouldContinue) {
        return false;
      }
    }
  }

  return true;
}
