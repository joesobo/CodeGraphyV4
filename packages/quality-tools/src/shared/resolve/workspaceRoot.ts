import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export function workspaceRootFrom(start?: string): string | undefined {
  if (!start) {
    return undefined;
  }

  for (
    let currentDirectory = resolve(start), previousDirectory = '';
    currentDirectory !== previousDirectory;
    previousDirectory = currentDirectory, currentDirectory = dirname(currentDirectory)
  ) {
    if (existsSync(join(currentDirectory, 'pnpm-workspace.yaml'))) {
      return currentDirectory;
    }
  }

  return undefined;
}
